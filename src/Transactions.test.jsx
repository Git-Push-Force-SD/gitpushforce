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

const mockTransactions = [
  {
    id: 'booking-1',
    buyer_id: 'user-1',
    seller_id: 'seller-1',
    date: '2026-05-20',
    time_slot: '10:00 - 11:00',
    location: 'Trade Facility — Room 2B',
    status: 'pending',
    buyer: { id: 'user-1', username: 'buyerUser', email: 'buyer@test.com' },
    seller: { id: 'seller-1', username: 'sellerUser', email: 'seller@test.com' },
    listing: {
      id: 'listing-1',
      title: 'MacBook Air',
      price: 8000,
      category: 'Electronics',
      condition: 'Good',
    },
  },
  {
    id: 'booking-2',
    buyer_id: 'buyer-2',
    seller_id: 'user-1',
    date: '2026-05-21',
    time_slot: '12:00 - 13:00',
    location: 'Library Exchange Point',
    status: 'collected',
    buyer: { id: 'buyer-2', username: 'anotherBuyer', email: 'buyer2@test.com' },
    seller: { id: 'user-1', username: 'sellerMe', email: 'me@test.com' },
    listing: {
      id: 'listing-2',
      title: 'Calculus Textbook',
      price: 250,
      category: 'Textbooks',
      condition: 'Like New',
    },
  },
];

const setupSupabaseMock = (data = mockTransactions, error = null) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  };

  supabase.from.mockReturnValue(query);
  return query;
};

describe('Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads transactions from Supabase', async () => {
    setupSupabaseMock();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('bookings');
    });

    expect(screen.getByText('MacBook Air')).toBeInTheDocument();
  });

  it('shows loading state first', () => {
    setupSupabaseMock();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument();
  });

  it('shows only incomplete transactions in queue view by default', async () => {
    setupSupabaseMock();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    expect(screen.queryByText('Calculus Textbook')).not.toBeInTheDocument();
  });

  it('shows all transactions in history view', async () => {
    setupSupabaseMock();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Transaction History'));

    expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    expect(screen.getByText('Calculus Textbook')).toBeInTheDocument();
  });

  it('filters transactions by search text', async () => {
    setupSupabaseMock();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'macbook' },
    });

    expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    expect(screen.queryByText('Calculus Textbook')).not.toBeInTheDocument();
  });

  it('shows buyer or seller role correctly', async () => {
    setupSupabaseMock();

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/You are: Buyer/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Transaction History'));

    expect(screen.getByText(/You are: Seller/i)).toBeInTheDocument();
  });

  it('shows empty message when no incomplete transactions exist', async () => {
    setupSupabaseMock([
      {
        ...mockTransactions[1],
        status: 'collected',
      },
    ]);

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No incomplete transactions found/i)).toBeInTheDocument();
    });
  });

  it('shows empty message when history is empty', async () => {
    setupSupabaseMock([]);

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    fireEvent.click(screen.getByText('Transaction History'));

    await waitFor(() => {
      expect(screen.getByText(/No transaction history found/i)).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', () => {
    setupSupabaseMock();
    const onBack = jest.fn();

    render(<Transactions user={mockUser} onBack={onBack} />);

    fireEvent.click(screen.getByText(/Back to dashboard/i));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('handles Supabase error safely', async () => {
    setupSupabaseMock(null, { message: 'Database error' });

    render(<Transactions user={mockUser} onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No incomplete transactions found/i)).toBeInTheDocument();
    });
  });
});