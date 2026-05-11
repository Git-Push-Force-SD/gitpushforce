import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HistoryView from './History';
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

describe('HistoryView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createBookingsMock = (data, error = null) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };

    chain.order
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ data, error });

    return chain;
  };

  const createUsersMock = (data) => ({
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data, error: null }),
  });

  it('should render loading state initially', () => {
    supabaseModule.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    });

    render(<HistoryView />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should render table with no history message', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock([]);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getAllByText('No history records').length).toBeGreaterThan(0);
    });
  });

  it('should render correct table headers', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock([]);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Party')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('should render collected bookings — shows buyer in Party column', async () => {
    const mockBookings = [
      {
        id: 'booking-1',
        trade_id: null,
        listing_id: 'list-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        status: 'collected',
        booking_type: 'sale',
        listings: { id: 'list-1', title: 'Book', image_path: null },
        trades: null,
      },
    ];

    const mockUsers = [
      { id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' },
      { id: 'seller-1', username: 'seller_user', email: 'seller@test.com' },
    ];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock(mockBookings);
      if (table === 'users') return createUsersMock(mockUsers);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getAllByText('Book').length).toBeGreaterThan(0);
      // Party column shows buyer for sale bookings
      expect(screen.getAllByText('buyer_user').length).toBeGreaterThan(0);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('should render cancelled bookings', async () => {
    const mockBookings = [
      {
        id: 'booking-2',
        trade_id: null,
        listing_id: 'list-2',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-29',
        time_slot: '14:00-15:00',
        status: 'cancelled',
        booking_type: 'sale',
        listings: { id: 'list-2', title: 'Pen', image_path: null },
        trades: null,
      },
    ];

    const mockUsers = [
      { id: 'buyer-1', username: 'buyer_user', email: 'buyer@test.com' },
      { id: 'seller-1', username: 'seller_user', email: 'seller@test.com' },
    ];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock(mockBookings);
      if (table === 'users') return createUsersMock(mockUsers);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getAllByText('Pen').length).toBeGreaterThan(0);
      expect(screen.getAllByText('cancelled').length).toBeGreaterThan(0);
    });
  });

  it('should render trade booking history — shows booked_by user in Party column', async () => {
    const mockBookings = [
      {
        id: 'booking-3',
        trade_id: 'trade-1',
        listing_id: null,
        buyer_id: null,
        seller_id: null,
        booked_by: 'initiator-1',
        date: '2026-05-01',
        time_slot: '10:00-11:00',
        status: 'collected',
        booking_type: 'trade',
        listings: null,
        trades: {
          id: 'trade-1',
          initiator_id: 'initiator-1',
          receiver_id: 'receiver-1',
          offered_listing_id: 'offered-1',
          requested_listing_id: 'requested-1',
        },
      },
    ];

    const mockUsers = [
      { id: 'initiator-1', username: 'alice', email: 'alice@test.com' },
      { id: 'receiver-1', username: 'bob', email: 'bob@test.com' },
    ];

    const mockTradeListings = [
      { id: 'offered-1', title: 'Laptop', image_path: null },
      { id: 'requested-1', title: 'Phone', image_path: null },
    ];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock(mockBookings);
      if (table === 'users') return createUsersMock(mockUsers);
      if (table === 'listings') return createUsersMock(mockTradeListings);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getAllByText('Trade').length).toBeGreaterThan(0);
      // booked_by user shown in Party column
      expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Laptop ↔ Phone').length).toBeGreaterThan(0);
    });
  });

  it('should render multiple history records', async () => {
    const mockBookings = [
      {
        id: 'booking-1',
        trade_id: null,
        listing_id: 'list-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        status: 'collected',
        booking_type: 'sale',
        listings: { title: 'Book A', image_path: null },
        trades: null,
      },
      {
        id: 'booking-2',
        trade_id: null,
        listing_id: 'list-2',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-29',
        time_slot: '14:00-15:00',
        status: 'cancelled',
        booking_type: 'sale',
        listings: { title: 'Book B', image_path: null },
        trades: null,
      },
    ];

    const mockUsers = [
      { id: 'buyer-1', username: 'buyer_user' },
      { id: 'seller-1', username: 'seller_user' },
    ];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock(mockBookings);
      if (table === 'users') return createUsersMock(mockUsers);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getAllByText('Book A').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Book B').length).toBeGreaterThan(0);
    });
  });

  it('should handle missing user data gracefully', async () => {
    const mockBookings = [
      {
        id: 'booking-1',
        trade_id: null,
        listing_id: 'list-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        status: 'collected',
        booking_type: 'sale',
        listings: { title: 'Notebook', image_path: null },
        trades: null,
      },
    ];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock(mockBookings);
      if (table === 'users') return createUsersMock([]);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getAllByText('Notebook').length).toBeGreaterThan(0);
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  it('should handle error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock(null, new Error('Fetch failed'));
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(screen.getAllByText('No history records').length).toBeGreaterThan(0);
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle bookings with missing listings', async () => {
    const mockBookings = [
      {
        id: 'booking-1',
        trade_id: null,
        listing_id: 'list-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        status: 'collected',
        booking_type: 'sale',
        listings: null,
        trades: null,
      },
    ];

    const mockUsers = [
      { id: 'buyer-1', username: 'buyer_user' },
      { id: 'seller-1', username: 'seller_user' },
    ];

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return createBookingsMock(mockBookings);
      if (table === 'users') return createUsersMock(mockUsers);
      return createUsersMock([]);
    });

    render(<HistoryView />);

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });
});
