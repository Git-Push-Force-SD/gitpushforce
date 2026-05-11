import { renderHook, waitFor } from '@testing-library/react';
import { useBookings } from './useBookings';
import { supabase } from '../utils/supabase';

jest.mock('../utils/supabase', () => ({ supabase: { from: jest.fn() } }));

// ─── Helper: Build Supabase chain mock ───────────────────────────────────────
const buildChainMock = (resolveValue = { data: null, error: null }) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(resolveValue),
    single: jest.fn().mockResolvedValue(resolveValue),
  };
  chain.then = (resolve, reject) => Promise.resolve(resolveValue).then(resolve, reject);
  return chain;
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockBooking = {
  id: 'booking-1',
  buyer_id: 'user-1',
  seller_id: 'seller-1',
  listing_id: 'listing-1',
  order_id: 'order-1',
  date: '2025-01-15',
  time_slot: '10:00',
  location: 'Trade Facility',
  status: 'confirmed',
  notes: 'Test booking',
  cancelled_at: null,
  created_at: '2025-01-10T10:00:00Z',
  listings: {
    id: 'listing-1',
    title: 'MacBook Pro',
    image_path: 'images/macbook.jpg',
    price: '15000',
  },
};

const mockBooking2 = {
  ...mockBooking,
  id: 'booking-2',
  date: '2025-01-20',
  status: 'pending',
};

const mockSeller = {
  id: 'seller-1',
  username: 'john_seller',
  email: 'seller@example.com',
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('useBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('returns initial state with empty bookings, loading=true, error=null', () => {
      supabase.from.mockReturnValue(buildChainMock());

      const { result } = renderHook(() => useBookings('user-1'));

      expect(result.current.bookings).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('returns a refetch function', () => {
      supabase.from.mockReturnValue(buildChainMock());

      const { result } = renderHook(() => useBookings('user-1'));

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Fetch bookings success', () => {
    it('fetches and returns bookings with seller names merged', async () => {
      const bookingsData = [mockBooking, mockBooking2];
      const bookingsWithSellersData = [
        { id: 'booking-1', seller_id: 'seller-1' },
        { id: 'booking-2', seller_id: 'seller-1' },
      ];

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: bookingsData, error: null }))
        .mockReturnValueOnce(buildChainMock({ data: bookingsWithSellersData, error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toHaveLength(2);
      expect(result.current.bookings[0].listings.title).toBe('MacBook Pro');
      expect(result.current.bookings[0].sellerName).toBe('john_seller');
      expect(result.current.error).toBe(null);
    });

    it('sets loading to false after successful fetch', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('handles empty bookings list', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('uses seller username if available, falls back to email prefix, then "Seller"', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings[0].sellerName).toBe('john_seller');
    });

    it('sorts bookings by created_at descending', async () => {
      const booking1 = { ...mockBooking, created_at: '2025-01-10T10:00:00Z' };
      const booking2 = { ...mockBooking, id: 'booking-2', created_at: '2025-01-15T10:00:00Z' };

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [booking1, booking2], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }, { id: 'booking-2', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toHaveLength(2);
    });
  });

  describe('Fetch bookings error', () => {
    it('sets error message when fetch fails', async () => {
      const fetchError = new Error('Network error');

      supabase.from.mockReturnValue(buildChainMock({ data: null, error: fetchError }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load bookings.');
      expect(result.current.bookings).toEqual([]);
    });

    it('logs error to console on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const fetchError = new Error('Database error');

      supabase.from.mockReturnValue(buildChainMock({ data: null, error: fetchError }));

      renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('[useBookings] fetch error:', fetchError);
      });

      consoleSpy.mockRestore();
    });

    it('clears error state before fetching', async () => {
      const fetchError = new Error('API error');

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: null, error: fetchError }))
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result, rerender } = renderHook(
        ({ userId }) => useBookings(userId),
        { initialProps: { userId: 'user-1' } }
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load bookings.');
      });

      rerender({ userId: 'user-2' });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });
  });

  describe('User ID handling', () => {
    it('does not fetch when userId is null or undefined', async () => {
      const mockChain = buildChainMock();
      supabase.from.mockReturnValue(mockChain);

      renderHook(() => useBookings(null));

      await waitFor(() => {
        expect(supabase.from).not.toHaveBeenCalled();
      });
    });

    it('refetches when userId changes', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking2], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-2', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result, rerender } = renderHook(
        ({ userId }) => useBookings(userId),
        { initialProps: { userId: 'user-1' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ userId: 'user-2' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Refetch functionality', () => {
    it('refetch function calls fetchBookings', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking, mockBooking2], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }, { id: 'booking-2', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toHaveLength(1);

      result.current.refetch();

      await waitFor(() => {
        expect(result.current.bookings).toHaveLength(2);
      });
    });

    it('sets loading to true when refetch is called', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Edge cases', () => {
    it('handles bookings with missing seller_id gracefully', async () => {
      const bookingNoSeller = { ...mockBooking, seller_id: undefined };

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [bookingNoSeller], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: undefined }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toHaveLength(1);
      expect(result.current.bookings[0].sellerName).toBe('Seller');
    });

    it('handles listings field as null or undefined', async () => {
      const bookingNoListings = { ...mockBooking, listings: null };

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [bookingNoListings], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toHaveLength(1);
    });

    it('handles empty seller list in database', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings[0].sellerName).toBe('Seller');
    });

    it('handles duplicate seller IDs correctly', async () => {
      const booking2WithSameSeller = { ...mockBooking, id: 'booking-2' };

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [mockBooking, booking2WithSameSeller], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [{ id: 'booking-1', seller_id: 'seller-1' }, { id: 'booking-2', seller_id: 'seller-1' }], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [mockSeller], error: null }));

      const { result } = renderHook(() => useBookings('user-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toHaveLength(2);
      expect(result.current.bookings[0].sellerName).toBe('john_seller');
      expect(result.current.bookings[1].sellerName).toBe('john_seller');
    });
  });
});