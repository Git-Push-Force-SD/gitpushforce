import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CollectionsView from './Collectionsview';
import * as supabaseModule from '../../utils/supabase';

jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('./facilUtils', () => ({
  badgeClasses: (status) => '',
  formatDate: (date) => date,
  formatTime: (time) => time,
}));

jest.mock('./imageUtils', () => ({
  getImageUrl: (listing) =>
    listing?.image_path
      ? `https://mock.supabase.co/storage/v1/object/public/Listings/${listing.image_path}`
      : null,
}));
// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeOrdersMock = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue(resolvedValue),
  }),
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
});

const makeBookingsMock = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(resolvedValue),
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
});

const makeUsersMock = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockResolvedValue(resolvedValue),
});

const makePaymentsMock = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockResolvedValue(resolvedValue),
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CollectionsView', () => {
  const mockUser = {
    id: 'user-123',
    email: 'staff@test.com',
    username: 'staff_member',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    supabaseModule.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(new Promise(() => {})), // never resolves
      }),
    });

    render(<CollectionsView user={mockUser} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should render table with no collections message', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: [], error: null });
      if (table === 'bookings') return makeBookingsMock({ data: [], error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('No items ready for collection').length).toBeGreaterThan(0);
    });
  });

  it('should render table headers', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: [], error: null });
      if (table === 'bookings') return makeBookingsMock({ data: [], error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('Buyer')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Payment')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('should render collection items with payment clear status', async () => {
    const mockOrders = [{ id: 'order-1' }];
    const mockBookings = [
      {
        id: 'booking-1',
        listing_id: 'list-1',
        order_id: 'order-1',
        buyer_id: 'buyer-1',
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        listings: { id: 'list-1', title: 'Camera', image_path: null },
      },
    ];
    const mockBuyers = [{ id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' }];
    const mockPayments = [{ id: 'payment-1', order_id: 'order-1', cash_shortfall: 0, cash_settled: true }];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: mockOrders, error: null });
      if (table === 'bookings') return makeBookingsMock({ data: mockBookings, error: null });
      if (table === 'users') return makeUsersMock({ data: mockBuyers, error: null });
      if (table === 'payments') return makePaymentsMock({ data: mockPayments, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('Camera').length).toBeGreaterThan(0);
      expect(screen.getAllByText('buyer_user').length).toBeGreaterThan(0);
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  it('should render collection items with cash outstanding status', async () => {
    const mockOrders = [{ id: 'order-1' }];
    const mockBookings = [
      {
        id: 'booking-1',
        listing_id: 'list-1',
        order_id: 'order-1',
        buyer_id: 'buyer-1',
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        listings: { id: 'list-1', title: 'Phone', image_path: null },
      },
    ];
    const mockBuyers = [{ id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' }];
    const mockPayments = [{ id: 'payment-1', order_id: 'order-1', cash_shortfall: 50, cash_settled: false }];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: mockOrders, error: null });
      if (table === 'bookings') return makeBookingsMock({ data: mockBookings, error: null });
      if (table === 'users') return makeUsersMock({ data: mockBuyers, error: null });
      if (table === 'payments') return makePaymentsMock({ data: mockPayments, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Outstanding')).toBeInTheDocument();
    });
  });

  it('should show Release and Mark Settled buttons when cash outstanding', async () => {
    const mockOrders = [{ id: 'order-1' }];
    const mockBookings = [
      {
        id: 'booking-1',
        listing_id: 'list-1',
        order_id: 'order-1',
        buyer_id: 'buyer-1',
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        listings: { id: 'list-1', title: 'Tablet', image_path: null },
      },
    ];
    const mockBuyers = [{ id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' }];
    const mockPayments = [{ id: 'payment-1', order_id: 'order-1', cash_shortfall: 100, cash_settled: false }];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: mockOrders, error: null });
      if (table === 'bookings') return makeBookingsMock({ data: mockBookings, error: null });
      if (table === 'users') return makeUsersMock({ data: mockBuyers, error: null });
      if (table === 'payments') return makePaymentsMock({ data: mockPayments, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('Tablet').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Release').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mark Settled').length).toBeGreaterThan(0);
    });
  });

  it('should show only Release button when payment is clear', async () => {
    const mockOrders = [{ id: 'order-1' }];
    const mockBookings = [
      {
        id: 'booking-1',
        listing_id: 'list-1',
        order_id: 'order-1',
        buyer_id: 'buyer-1',
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        listings: { id: 'list-1', title: 'Headphones', image_path: null },
      },
    ];
    const mockBuyers = [{ id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' }];
    const mockPayments = [{ id: 'payment-1', order_id: 'order-1', cash_shortfall: 0, cash_settled: true }];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: mockOrders, error: null });
      if (table === 'bookings') return makeBookingsMock({ data: mockBookings, error: null });
      if (table === 'users') return makeUsersMock({ data: mockBuyers, error: null });
      if (table === 'payments') return makePaymentsMock({ data: mockPayments, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('Headphones').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Release').length).toBeGreaterThan(0);
      expect(screen.queryByText('Mark Settled')).not.toBeInTheDocument();
    });
  });

  it('should handle Release Item button click', async () => {
    const mockOrders = [{ id: 'order-1' }];
    const mockBookings = [
      {
        id: 'booking-1',
        listing_id: 'list-1',
        order_id: 'order-1',
        buyer_id: 'buyer-1',
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        listings: { id: 'list-1', title: 'Monitor', image_path: null },
      },
    ];
    const mockBuyers = [{ id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' }];
    const mockPayments = [{ id: 'payment-1', order_id: 'order-1', cash_shortfall: 0, cash_settled: true }];

    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
          }),
          update: mockUpdate,
        };
      }
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
          update: mockUpdate,
        };
      }
      if (table === 'users') return makeUsersMock({ data: mockBuyers, error: null });
      if (table === 'payments') return makePaymentsMock({ data: mockPayments, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('Monitor').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Release')[0]);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateEq).toHaveBeenCalled();
    });
  });

  it('should handle error gracefully', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
          }),
        };
      }
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(screen.getAllByText('No items ready for collection').length).toBeGreaterThan(0);
    });

    consoleErrorSpy.mockRestore();
  });

  // ─── New: mobile bottom sheet ─────────────────────────────────────────────

  it('should open bottom sheet when mobile row is tapped', async () => {
    const mockOrders = [{ id: 'order-1' }];
    const mockBookings = [
      {
        id: 'booking-1',
        listing_id: 'list-1',
        order_id: 'order-1',
        buyer_id: 'buyer-1',
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        listings: { id: 'list-1', title: 'Laptop', image_path: null },
      },
    ];
    const mockBuyers = [{ id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' }];
    const mockPayments = [{ id: 'payment-1', order_id: 'order-1', cash_shortfall: 0, cash_settled: true }];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: mockOrders, error: null });
      if (table === 'bookings') return makeBookingsMock({ data: mockBookings, error: null });
      if (table === 'users') return makeUsersMock({ data: mockBuyers, error: null });
      if (table === 'payments') return makePaymentsMock({ data: mockPayments, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => expect(screen.getAllByText('Laptop').length).toBeGreaterThan(0));

    const rowButton = screen.getAllByRole('button').find(
      b => b.textContent.includes('Laptop') && b.textContent.includes('buyer_user')
    );
    expect(rowButton).toBeTruthy();
    fireEvent.click(rowButton);

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('should close bottom sheet when Close is clicked', async () => {
    const mockOrders = [{ id: 'order-1' }];
    const mockBookings = [
      {
        id: 'booking-1',
        listing_id: 'list-1',
        order_id: 'order-1',
        buyer_id: 'buyer-1',
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        listings: { id: 'list-1', title: 'Keyboard', image_path: null },
      },
    ];
    const mockBuyers = [{ id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' }];
    const mockPayments = [{ id: 'payment-1', order_id: 'order-1', cash_shortfall: 0, cash_settled: true }];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'orders') return makeOrdersMock({ data: mockOrders, error: null });
      if (table === 'bookings') return makeBookingsMock({ data: mockBookings, error: null });
      if (table === 'users') return makeUsersMock({ data: mockBuyers, error: null });
      if (table === 'payments') return makePaymentsMock({ data: mockPayments, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<CollectionsView user={mockUser} />);

    await waitFor(() => expect(screen.getAllByText('Keyboard').length).toBeGreaterThan(0));

    const rowButton = screen.getAllByRole('button').find(
      b => b.textContent.includes('Keyboard') && b.textContent.includes('buyer_user')
    );
    expect(rowButton).toBeTruthy();
    fireEvent.click(rowButton);

    await waitFor(() => expect(screen.getByText('Close')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });
  });
});
