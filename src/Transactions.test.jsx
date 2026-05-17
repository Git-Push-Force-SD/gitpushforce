import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Transactions from './Transactions';
import { supabase } from '../utils/supabase';

jest.mock('../utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: () => null,
  Search: () => null,
  Package: () => null,
  ShoppingBag: () => null,
  Store: () => null,
  Repeat2: () => null,
}));

const mockUser = { id: 'user-1' };

const mockBuyerOrders = [
  {
    id: 'order-1',
    buyer_id: 'user-1',
    listing_id: 'listing-1',
    status: 'completed',
    buyer_status: 'collected',
    placed_at: '2026-05-01T10:00:00Z',
    listings: {
      id: 'listing-1',
      title: 'MacBook Air',
      price: 8500,
      category: 'Electronics',
      condition: 'Good',
      seller_id: 'seller-1',
      image_path: null,
      seller: { id: 'seller-1', username: 'Sarah', email: 'sarah@test.com' },
    },
  },
  {
    id: 'order-3',
    buyer_id: 'user-1',
    listing_id: 'listing-3',
    status: 'pending',
    buyer_status: 'pending',
    placed_at: '2026-05-03T10:00:00Z',
    listings: {
      id: 'listing-3',
      title: 'Pending Headphones',
      price: 900,
      category: 'Electronics',
      condition: 'New',
      seller_id: 'seller-2',
      image_path: null,
      seller: { id: 'seller-2', username: 'Neo', email: 'neo@test.com' },
    },
  },
];

const mockSellerListings = [{ id: 'listing-2' }];

const mockSellerOrders = [
  {
    id: 'order-2',
    buyer_id: 'buyer-2',
    listing_id: 'listing-2',
    status: 'completed',
    buyer_status: 'collected',
    placed_at: '2026-05-02T10:00:00Z',
    listings: {
      id: 'listing-2',
      title: 'Calculus Textbook',
      price: 300,
      category: 'Textbooks',
      condition: 'Like New',
      seller_id: 'user-1',
      image_path: null,
      seller: { id: 'user-1', username: 'Me', email: 'me@test.com' },
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
    initiator: { id: 'user-1', username: 'Me', email: 'me@test.com' },
    receiver: { id: 'user-2', username: 'Lebo', email: 'lebo@test.com' },
  },
  {
    id: 'trade-2',
    initiator_id: 'user-1',
    receiver_id: 'user-3',
    status: 'pending',
    created_at: '2026-05-05T10:00:00Z',
    initiator: { id: 'user-1', username: 'Me', email: 'me@test.com' },
    receiver: { id: 'user-3', username: 'Ayesha', email: 'ayesha@test.com' },
  },
];

// Tracks call count to distinguish buyer orders query from seller orders query
let ordersCallCount = 0;

const mockSupabase = ({
  buyerOrders = mockBuyerOrders,
  sellerListings = mockSellerListings,
  sellerOrders = mockSellerOrders,
  trades = mockTrades,
  error = null,
} = {}) => {
  ordersCallCount = 0;

  supabase.from.mockImplementation((table) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };

    if (table === 'orders') {
      chain.order.mockImplementation(() => {
        ordersCallCount++;
        if (error) return Promise.resolve({ data: null, error });
        // First call = buyer orders, second call = seller orders
        return Promise.resolve({
          data: ordersCallCount === 1 ? buyerOrders : sellerOrders,
          error: null,
        });
      });
    }

    if (table === 'listings') {
      chain.eq.mockReturnValue({
        // resolves immediately (no .order on listings query)
        then: (resolve) => resolve({ data: sellerListings, error: error || null }),
        catch: () => {},
      });
      // also support direct await
      chain.select.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: sellerListings, error: error || null }),
      });
    }

    if (table === 'trades') {
      chain.order.mockResolvedValue({ data: error ? null : trades, error: error || null });
    }

    return chain;
  });
};

describe('Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ordersCallCount = 0;
  });

  it('renders the page heading', async () => {
    mockSupabase();
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    expect(screen.getByText(/Loading completed transactions/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/Completed Purchases, Sales & Trades/i)).toBeInTheDocument()
    );
  });

  it('fetches orders and trades from Supabase', async () => {
    mockSupabase();
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('orders'));
    expect(supabase.from).toHaveBeenCalledWith('trades');
  });

  it('shows only completed purchases in BUYING tab', async () => {
    mockSupabase();
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('MacBook Air')).toBeInTheDocument());
    expect(screen.queryByText('Pending Headphones')).not.toBeInTheDocument();
    expect(screen.getByText(/Seller: Sarah/i)).toBeInTheDocument();
  });

  it('shows completed sales in SELLING tab', async () => {
    mockSupabase();
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('MacBook Air')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SELLING'));
    await waitFor(() => expect(screen.getByText('Calculus Textbook')).toBeInTheDocument());
    expect(screen.getByText('Completed sale')).toBeInTheDocument();
  });

  it('shows only completed trades in TRADES tab', async () => {
    mockSupabase();
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('MacBook Air')).toBeInTheDocument());
    fireEvent.click(screen.getByText('TRADES'));
    await waitFor(() => expect(screen.getByText('Completed Trade')).toBeInTheDocument());
    expect(screen.getByText(/With: Lebo/i)).toBeInTheDocument();
    expect(screen.queryByText(/With: Ayesha/i)).not.toBeInTheDocument();
  });

  it('filters purchases using search', async () => {
    mockSupabase();
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('MacBook Air')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Search completed transactions/i), {
      target: { value: 'nothing' },
    });
    expect(screen.queryByText('MacBook Air')).not.toBeInTheDocument();
    expect(screen.getByText(/No completed purchases found/i)).toBeInTheDocument();
  });

  it('filters trades using search by counterparty username', async () => {
    mockSupabase();
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('MacBook Air')).toBeInTheDocument());
    fireEvent.click(screen.getByText('TRADES'));
    await waitFor(() => expect(screen.getByText('Completed Trade')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Search completed transactions/i), {
      target: { value: 'lebo' },
    });
    expect(screen.getByText(/With: Lebo/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no completed purchases', async () => {
    mockSupabase({ buyerOrders: [], sellerListings: [], sellerOrders: [], trades: [] });
    render(<Transactions user={mockUser} onBack={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/No completed purchases found/i)).toBeInTheDocument()
    );
  });

  it('calls onBack when back button is clicked', async () => {
    mockSupabase();
    const onBack = jest.fn();
    render(<Transactions user={mockUser} onBack={onBack} />);
    fireEvent.click(screen.getByText(/Back to dashboard/i));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders nothing sensitive when user is null', async () => {
    render(<Transactions user={null} onBack={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/No completed purchases found/i)).toBeInTheDocument()
    );
  });

  it('does not show back button in compact mode', () => {
    mockSupabase();
    render(<Transactions user={mockUser} compact={true} />);
    expect(screen.queryByText(/Back to dashboard/i)).not.toBeInTheDocument();
  });
});