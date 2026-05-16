import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Transactions from './Transactions';
import { supabase } from '../utils/supabase';

jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockUser = { id: 'user-1' };

const mockOrders = [
  {
    id: 'order-1',
    buyer_id: 'user-1',
    status: 'completed',
    buyer_status: 'collected',
    created_at: '2026-05-01T10:00:00Z',
    listings: {
      id: 'listing-1',
      title: 'MacBook Air',
      price: 8500,
      category: 'Electronics',
      condition: 'Good',
      seller_id: 'seller-1',
      seller: {
        id: 'seller-1',
        username: 'Sarah',
        email: 'sarah@test.com',
      },
    },
  },
  {
    id: 'order-2',
    buyer_id: 'buyer-2',
    status: 'completed',
    buyer_status: 'collected',
    created_at: '2026-05-02T10:00:00Z',
    listings: {
      id: 'listing-2',
      title: 'Calculus Textbook',
      price: 300,
      category: 'Textbooks',
      condition: 'Like New',
      seller_id: 'user-1',
      seller: {
        id: 'user-1',
        username: 'Me',
        email: 'me@test.com',
      },
    },
  },
  {
    id: 'order-3',
    buyer_id: 'user-1',
    status: 'pending',
    buyer_status: 'pending',
    created_at: '2026-05-03T10:00:00Z',
    listings: {
      id: 'listing-3',
      title: 'Pending Headphones',
      price: 900,
      category: 'Electronics',
      condition: 'New',
      seller_id: 'seller-2',
      seller: {
        id: 'seller-2',
        username: 'Neo',
        email: 'neo@test.com',
      },
    },
  },
];

const mockTrades = [
  {
    id: 'trade-1',
    initiator_id: 'user-1',
    receiver_id: 'user-2',
    status: 'completed',
    created_at: '2026-05-04T10:00:00Z',
    initiator: {
      id: 'user-1',
      username: 'Me',
      email: 'me@test.com',
    },
    receiver: {
      id: 'user-2',
      username: 'Lebo',
      email: 'lebo@test.com',
    },
    bookings: [
      {
        id: 'booking-1',
        status: 'collected',
        date: '2026-05-10',
        time_slot: '10:00 - 11:00',
        location: 'Trade Facility — Room 2B',
        listing: {
          id: 'listing-4',
          title: 'Nike Dunks',
          price: 1200,
          category: 'Fashion',
          condition: 'Good',
        },
      },
      {
        id: 'booking-2',
        status: 'collected',
        date: '2026-05-10',
        time_slot: '10:00 - 11:00',
        location: 'Trade Facility — Room 2B',
        listing: {
          id: 'listing-5',
          title: 'Sony Headphones',
          price: 1500,
          category: 'Audio',
          condition: 'Good',
        },
      },
    ],
  },
  {
    id: 'trade-2',
    initiator_id: 'user-1',
    receiver_id: 'user-3',
    status: 'pending',
    created_at: '2026-05-05T10:00:00Z',
    initiator: {
      id: 'user-1',
      username: 'Me',
      email: 'me@test.com',
    },
    receiver: {
      id: 'user-3',
      username: 'Ayesha',
      email: 'ayesha@test.com',
    },
    bookings: [
      {
        id: 'booking-3',
        status: 'pending',
        date: '2026-05-12',
        time_slot: '12:00 - 13:00',
        location: 'Library',
        listing: {
          id: 'listing-6',
          title: 'Pending Trade Item',
          price: 500,
        },
      },
    ],
  },
];

const mockSupabase = ({ orders = mockOrders, trades = mockTrades } = {}) => {
  supabase.from.mockImplementation((table) => {
    const query = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };

    if (table === 'orders') {
      query.order.mockResolvedValue({ data: orders, error: null });
    }

    if (table === 'trades') {
      query.order.mockResolvedValue({ data: trades, error: null });
    }

    return query;
  });
};

describe('Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page heading', async () => {
    mockSupabase();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    expect(screen.getByText(/Loading completed transactions/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Completed Purchases, Sales & Trades/i)).toBeInTheDocument();
    });
  });

  it('fetches orders and trades from Supabase', async () => {
    mockSupabase();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('orders');
      expect(supabase.from).toHaveBeenCalledWith('trades');
    });
  });

  it('shows only completed purchases in BUYING tab', async () => {
    mockSupabase();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    expect(screen.queryByText('Pending Headphones')).not.toBeInTheDocument();
    expect(screen.getByText(/Seller: Sarah/i)).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows completed sales in SELLING tab', async () => {
    mockSupabase();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SELLING'));

    expect(screen.getByText('Calculus Textbook')).toBeInTheDocument();
    expect(screen.getByText('Completed sale')).toBeInTheDocument();
  });

  it('shows only completed trades in TRADES tab', async () => {
    mockSupabase();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('TRADES'));

    expect(screen.getByText('Completed Trade')).toBeInTheDocument();
    expect(screen.getByText('Nike Dunks')).toBeInTheDocument();
    expect(screen.getByText('Sony Headphones')).toBeInTheDocument();
    expect(screen.queryByText('Pending Trade Item')).not.toBeInTheDocument();
  });

  it('filters purchases using search', async () => {
    mockSupabase();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Search completed item/i), {
      target: { value: 'nothing' },
    });

    expect(screen.queryByText('MacBook Air')).not.toBeInTheDocument();
    expect(screen.getByText(/No completed purchases found/i)).toBeInTheDocument();
  });

  it('filters trades using search', async () => {
    mockSupabase();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('TRADES'));

    fireEvent.change(screen.getByPlaceholderText(/Search completed item/i), {
      target: { value: 'nike' },
    });

    expect(screen.getByText('Nike Dunks')).toBeInTheDocument();
    expect(screen.queryByText('Pending Trade Item')).not.toBeInTheDocument();
  });

  it('shows empty state when there are no completed purchases', async () => {
    mockSupabase({
      orders: mockOrders.filter((order) => order.status !== 'completed'),
      trades: [],
    });

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No completed purchases found/i)).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', () => {
    mockSupabase();

    const onBack = jest.fn();

    render(<Transactions user={mockUser} onBack={onBack} />);

    fireEvent.click(screen.getByText(/Back to dashboard/i));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('handles Supabase errors safely', async () => {
    supabase.from.mockImplementation((table) => {
      const query = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: `${table} error` },
        }),
      };

      return query;
    });

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No completed purchases found/i)).toBeInTheDocument();
    });
  });
});