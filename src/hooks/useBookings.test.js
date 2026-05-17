import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useBookings,
  useEligibleOrders,
  useAvailableSlots,
  useEligibleTrades,
  createBooking,
  createTradeBooking,
  cancelBooking,
  useSellerPendingOrders,
} from './useBookings';

import { supabase } from '../utils/supabase';

jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../utils/bookingConstants', () => ({
  DEFAULT_TIME_SLOTS: [
    '09:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
  ],
  FACILITY_LOCATION: 'Main Trade Facility',
}));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const createChain = (resolved = { data: null, error: null }) => {
  const chain = {};

  // Define all chainable methods that return the chain
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'in',
    'or',
    'order',
    'single',
  ];

  methods.forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });

  // Make the chain thenable - reject on error, resolve on success
  chain.then = (resolve, reject) => {
    if (resolved && resolved.error) {
      return Promise.reject(resolved.error).then(resolve, reject);
    }
    return Promise.resolve(resolved || {}).then(resolve, reject);
  };

  // Support .catch() for error handling
  chain.catch = (onRejected) => {
    if (resolved && resolved.error) {
      return Promise.reject(resolved.error).catch(onRejected);
    }
    return Promise.resolve(chain);
  };

  return chain;
};

const booking = {
  id: 'booking-1',
  order_id: 'order-1',
  listing_id: 'listing-1',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  date: '2026-05-20',
  time_slot: '10:00-11:00',
  location: 'Main Trade Facility',
  status: 'pending',
  notes: 'Handle with care',
  cancelled_at: null,
  created_at: '2026-05-17T10:00:00Z',
  listings: {
    id: 'listing-1',
    title: 'Gaming Laptop',
    image_path: 'gaming.jpg',
    price: 12000,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// useBookings
// ─────────────────────────────────────────────────────────────
describe('useBookings', () => {
  it('loads bookings successfully', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: [booking],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [{ id: 'booking-1', seller_id: 'seller-1' }],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [
          {
            id: 'seller-1',
            username: 'john',
            email: 'john@test.com',
          },
        ],
        error: null,
      }));

    const { result } = renderHook(() => useBookings('buyer-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toHaveLength(1);
    expect(result.current.bookings[0].sellerName).toBe('john');
    expect(result.current.error).toBe(null);
  });

  it('handles fetch errors', async () => {
    supabase.from.mockReturnValue(
      createChain({
        data: null,
        error: new Error('failed'),
      })
    );

    const { result } = renderHook(() => useBookings('buyer-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load bookings.');
    expect(result.current.bookings).toEqual([]);
  });

  it('does not fetch when userId is missing', () => {
    renderHook(() => useBookings(null));

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('supports refetching', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: [booking],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [{ id: 'booking-1', seller_id: 'seller-1' }],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [{ id: 'seller-1', username: 'john' }],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [booking, { ...booking, id: 'booking-2' }],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [
          { id: 'booking-1', seller_id: 'seller-1' },
          { id: 'booking-2', seller_id: 'seller-1' },
        ],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [{ id: 'seller-1', username: 'john' }],
        error: null,
      }));

    const { result } = renderHook(() => useBookings('buyer-1'));

    await waitFor(() => {
      expect(result.current.bookings).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.bookings).toHaveLength(2);
  });

  it('falls back to Seller when username is missing', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: [booking],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [{ id: 'booking-1', seller_id: 'seller-1' }],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [
          {
            id: 'seller-1',
            email: 'fallback@test.com',
          },
        ],
        error: null,
      }));

    const { result } = renderHook(() => useBookings('buyer-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings[0].sellerName).toBe('fallback');
  });
});

// ─────────────────────────────────────────────────────────────
// useEligibleOrders
// ─────────────────────────────────────────────────────────────
describe('useEligibleOrders', () => {
  it('returns eligible seller orders', async () => {
    const paidOrders = [
      {
        id: 'order-1',
        buyer_id: 'buyer-1',
        listing_id: 'listing-1',
        amount_due: 500,
        listings: {
          id: 'listing-1',
          title: 'Phone',
          seller_id: 'seller-1',
          image_path: 'phone.jpg',
        },
      },
    ];

    supabase.from
      .mockReturnValueOnce(createChain({
        data: paidOrders,
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [
          {
            id: 'seller-1',
            username: 'sellerUser',
          },
        ],
        error: null,
      }));

    const { result } = renderHook(() =>
      useEligibleOrders('seller-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].sellerName).toBe('sellerUser');
  });

  it('handles eligible order errors', async () => {
    supabase.from.mockReturnValue(
      createChain({
        data: null,
        error: new Error('orders failed'),
      })
    );

    const { result } = renderHook(() =>
      useEligibleOrders('seller-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(
      'Failed to load eligible orders.'
    );
  });

  it('filters out already booked eligible orders', async () => {
    const paidOrders = [
      {
        id: 'order-1',
        buyer_id: 'buyer-1',
        listing_id: 'listing-1',
        amount_due: 500,
        listings: {
          id: 'listing-1',
          title: 'Phone',
          seller_id: 'seller-1',
        },
      },
    ];

    supabase.from
      .mockReturnValueOnce(createChain({
        data: paidOrders,
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [
          {
            order_id: 'order-1',
            status: 'pending',
          },
        ],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [],
        error: null,
      }));

    const { result } = renderHook(() =>
      useEligibleOrders('seller-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// useAvailableSlots
// ─────────────────────────────────────────────────────────────
describe('useAvailableSlots', () => {
  it('loads available slots', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: [
          {
            time_slot: '10:00-11:00',
            capacity: 5,
          },
        ],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [
          {
            time_slot: '10:00-11:00',
          },
        ],
        error: null,
      }));

    const { result } = renderHook(() =>
      useAvailableSlots('2099-01-01')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const targetSlot = result.current.slots.find(s => s.timeSlot === '10:00-11:00');
    expect(targetSlot).toBeDefined();
    expect(targetSlot.taken).toBe(1);
    expect(targetSlot.available).toBe(true);
  });

  it('falls back to default slots', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: [],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [],
        error: null,
      }));

    const { result } = renderHook(() =>
      useAvailableSlots('2099-01-01')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.slots.length).toBeGreaterThan(0);
  });

  it('handles slot fetch errors', async () => {
    supabase.from.mockReturnValue(
      createChain({
        data: null,
        error: new Error('slots failed'),
      })
    );

    const { result } = renderHook(() =>
      useAvailableSlots('2099-01-01')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(
      'Failed to load time slots.'
    );
  });

  it('filters out cancelled bookings from slot counts', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: [
          {
            time_slot: '10:00-11:00',
            capacity: 1,
          },
        ],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [],
        error: null,
      }));

    const { result } = renderHook(() =>
      useAvailableSlots('2099-01-01')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.slots[0].available).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// useEligibleTrades
// ─────────────────────────────────────────────────────────────
describe('useEligibleTrades', () => {
  it('loads accepted trades', async () => {
    const trades = [
      {
        id: 'trade-1',
        initiator_id: 'user-1',
        receiver_id: 'user-2',
        status: 'accepted',
        offered_listing: {
          title: 'PS5',
        },
        requested_listing: {
          title: 'Xbox',
        },
      },
    ];

    supabase.from
      .mockReturnValueOnce(createChain({
        data: trades,
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [],
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [
          {
            id: 'user-2',
            username: 'partnerUser',
          },
        ],
        error: null,
      }));

    const { result } = renderHook(() =>
      useEligibleTrades('user-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trades).toHaveLength(1);
    expect(result.current.trades[0].partnerName).toBe('partnerUser');
  });

  it('handles trade errors', async () => {
    supabase.from.mockReturnValue(
      createChain({
        data: null,
        error: new Error('trade error'),
      })
    );

    const { result } = renderHook(() =>
      useEligibleTrades('user-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(
      'Failed to load eligible trades.'
    );
  });

  it('returns empty trades when none exist', async () => {
    supabase.from.mockReturnValueOnce(
      createChain({
        data: [],
        error: null,
      })
    );

    const { result } = renderHook(() =>
      useEligibleTrades('user-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trades).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// createBooking
// ─────────────────────────────────────────────────────────────
describe('createBooking', () => {
  it('creates a normal booking', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: {
          id: 'booking-created',
        },
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: null,
        error: null,
      }));

    const result = await createBooking({
      orderId: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      listingId: 'listing-1',
      date: '2026-05-20',
      timeSlot: '10:00-11:00',
      notes: 'Fragile',
    });

    expect(result.id).toBe('booking-created');
  });

  it('creates a trade booking', async () => {
    supabase.from.mockReturnValueOnce(
      createChain({
        data: {
          id: 'trade-booking',
        },
        error: null,
      })
    );

    const result = await createBooking({
      tradeId: 'trade-1',
      bookingType: 'trade',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      bookedBy: 'buyer-1',
      date: '2026-05-20',
      timeSlot: '10:00-11:00',
      notes: 'Trade item',
    });

    expect(result.id).toBe('trade-booking');
  });

  it('throws booking errors', async () => {
    supabase.from.mockReturnValueOnce(
      createChain({
        data: null,
        error: new Error('insert failed'),
      })
    );

    await expect(
      createBooking({
        orderId: 'order-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        listingId: 'listing-1',
        date: '2026-05-20',
        timeSlot: '10:00-11:00',
      })
    ).rejects.toThrow('insert failed');
  });
});

// ─────────────────────────────────────────────────────────────
// createTradeBooking
// ─────────────────────────────────────────────────────────────
describe('createTradeBooking', () => {
  it('creates trade booking using wrapper', async () => {
    supabase.from.mockReturnValueOnce(
      createChain({
        data: {
          id: 'wrapped-trade',
        },
        error: null,
      })
    );

    const result = await createTradeBooking({
      tradeId: 'trade-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      bookedBy: 'buyer-1',
      date: '2026-05-20',
      timeSlot: '10:00-11:00',
    });

    expect(result.id).toBe('wrapped-trade');
  });
});

// ─────────────────────────────────────────────────────────────
// cancelBooking
// ─────────────────────────────────────────────────────────────
describe('cancelBooking', () => {
  it('cancels booking and resets order status', async () => {
    supabase.from
      .mockReturnValueOnce(createChain({
        data: {},
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: {},
        error: null,
      }));

    await expect(
      cancelBooking({
        bookingId: 'booking-1',
        orderId: 'order-1',
        userId: 'buyer-1',
      })
    ).resolves.not.toThrow();
  });

  it('throws cancel errors', async () => {
    supabase.from.mockReturnValueOnce(
      createChain({
        data: null,
        error: new Error('cancel failed'),
      })
    );

    await expect(
      cancelBooking({
        bookingId: 'booking-1',
        orderId: 'order-1',
        userId: 'buyer-1',
      })
    ).rejects.toThrow('cancel failed');
  });
});

// ─────────────────────────────────────────────────────────────
// useSellerPendingOrders
// ─────────────────────────────────────────────────────────────
describe('useSellerPendingOrders', () => {
  it('returns seller pending orders', async () => {
    const orders = [
      {
        id: 'order-1',
        status: 'paid',
        listings: {
          id: 'listing-1',
          title: 'Tablet',
          seller_id: 'seller-1',
        },
      },
    ];

    supabase.from
      .mockReturnValueOnce(createChain({
        data: orders,
        error: null,
      }))
      .mockReturnValueOnce(createChain({
        data: [],
        error: null,
      }));

    const { result } = renderHook(() =>
      useSellerPendingOrders('seller-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pendingOrders).toHaveLength(1);
  });

  it('handles pending order fetch errors', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    supabase.from.mockReturnValue(
      createChain({
        data: null,
        error: new Error('pending failed'),
      })
    );

    const { result } = renderHook(() =>
      useSellerPendingOrders('seller-1')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
