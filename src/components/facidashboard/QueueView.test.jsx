import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import QueueView from './QueueView';
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

describe('QueueView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const pendingOrder = {
      order: jest.fn(() => new Promise(() => {})),
    };

    supabaseModule.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue(pendingOrder),
    });

    render(<QueueView />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render table with no bookings message', async () => {
    const mockOrder = {
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnValue(mockOrder),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<QueueView />);

    await waitFor(() => {
      expect(
        screen.getAllByText('No pending or confirmed bookings').length
      ).toBeGreaterThan(0);
    });
  });

  it('should render correct table headers', async () => {
    const mockOrder = {
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnValue(mockOrder),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<QueueView />);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Booking Party')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('should render sale booking data correctly — shows buyer in Booking Party', async () => {
    const mockBookings = [
      {
        id: '1',
        trade_id: null,
        listing_id: 'list-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        location: 'Library',
        status: 'pending',
        booking_type: 'sale',
        listings: { id: 'list-1', title: 'Physics Textbook', image_path: null },
        trades: null,
      },
    ];

    const mockUsers = [
      { id: 'buyer-1', username: 'john_doe', email: 'john@test.com' },
      { id: 'seller-1', username: 'jane_smith', email: 'jane@test.com' },
    ];

    const mockOrder = {
      order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
    };

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnValue(mockOrder),
        };
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<QueueView />);

    await waitFor(() => {
      expect(screen.getAllByText('Physics Textbook').length).toBeGreaterThan(0);
      // Buyer shown in Booking Party column for sale bookings
      expect(screen.getAllByText('john_doe').length).toBeGreaterThan(0);
      expect(screen.getByText('09:00-10:00')).toBeInTheDocument();
    });
  });

  it('should render trade booking data correctly — shows trade party role', async () => {
    const mockBookings = [
      {
        id: '2',
        trade_id: 'trade-1',
        listing_id: null,
        buyer_id: null,
        seller_id: null,
        booked_by: 'initiator-1',
        date: '2026-05-01',
        time_slot: '10:00-11:00',
        location: 'Trade Facility — Room 2B',
        status: 'pending',
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

    const mockOrder = {
      order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
    };

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnValue(mockOrder),
        };
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      if (table === 'listings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockTradeListings, error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<QueueView />);

    await waitFor(() => {
      // Trade type badge shown
      expect(screen.getAllByText('Trade').length).toBeGreaterThan(0);
      // Booking party shows booked_by user's username
      expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
      // Trade items shown
      expect(screen.getAllByText('Laptop ↔ Phone').length).toBeGreaterThan(0);
    });
  });

  it('should handle multiple bookings', async () => {
    const mockBookings = [
      {
        id: '1',
        trade_id: null,
        listing_id: 'list-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        location: 'Library',
        status: 'pending',
        booking_type: 'sale',
        listings: { id: 'list-1', title: 'Book A', image_path: null },
        trades: null,
      },
      {
        id: '2',
        trade_id: null,
        listing_id: 'list-2',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '10:00-11:00',
        location: 'Cafe',
        status: 'confirmed',
        booking_type: 'sale',
        listings: { id: 'list-2', title: 'Book B', image_path: null },
        trades: null,
      },
    ];

    const mockUsers = [
      { id: 'buyer-1', username: 'buyer1', email: 'buyer1@test.com' },
      { id: 'seller-1', username: 'seller1', email: 'seller1@test.com' },
    ];

    const mockOrder = {
      order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
    };

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnValue(mockOrder),
        };
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<QueueView />);

    await waitFor(() => {
      expect(screen.getAllByText('Book A').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Book B').length).toBeGreaterThan(0);
    });
  });

  it('should handle error gracefully', async () => {
    const mockOrder = {
      order: jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Fetch failed'),
      }),
    };

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnValue(mockOrder),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<QueueView />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(
        screen.getAllByText('No pending or confirmed bookings').length
      ).toBeGreaterThan(0);
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle missing user data gracefully — shows N/A', async () => {
    const mockBookings = [
      {
        id: '1',
        trade_id: null,
        listing_id: 'list-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        booked_by: null,
        date: '2026-04-30',
        time_slot: '09:00-10:00',
        location: 'Library',
        status: 'pending',
        booking_type: 'sale',
        listings: { id: 'list-1', title: 'Physics Textbook', image_path: null },
        trades: null,
      },
    ];

    const mockOrder = {
      order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
    };

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnValue(mockOrder),
        };
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(<QueueView />);

    await waitFor(() => {
      expect(screen.getAllByText('Physics Textbook').length).toBeGreaterThan(0);
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });
});
