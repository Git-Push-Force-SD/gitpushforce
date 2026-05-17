import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfileModal from './UserProfileModal';

// Mock supabase
jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock child components
jest.mock('./StarRating', () => ({ rating }) => <div data-testid="star-rating" data-rating={rating} />);
jest.mock('./../Transactions', () => ({ user, compact }) => (
  <div data-testid="transactions" data-user-id={user?.id} data-compact={String(compact)} />
));

import { supabase } from '../utils/supabase';

const mockUser = { id: 'user-123', username: 'Alice', profile_picture_url: null };
const mockReviews = [
  {
    id: 'review-1',
    rating: 4,
    comment: 'Great seller!',
    created_at: new Date(Date.now() - 60000).toISOString(),
    listing: { id: 'listing-1', title: 'Textbook' },
    reviewer: { id: 'reviewer-1', username: 'Bob', profile_picture_url: null },
  },
];

const buildSupabaseMock = ({ userData = mockUser, reviewsData = mockReviews, userError = null, reviewsError = null } = {}) => {
  supabase.from.mockImplementation((table) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: userData, error: userError }),
    };
    if (table === 'reviews') {
      chain.order.mockResolvedValue({ data: reviewsData, error: reviewsError });
    }
    return chain;
  });
};

const baseProps = {
  isOpen: true,
  onClose: jest.fn(),
  userId: 'user-123',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UserProfileModal', () => {
  describe('visibility', () => {
    it('renders nothing when isOpen is false', () => {
      render(<UserProfileModal {...baseProps} isOpen={false} />);
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton loaders while fetching', () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      // animate-pulse elements are present during load
      const pulses = document.querySelectorAll('.animate-pulse');
      expect(pulses.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows error when user not found', async () => {
      buildSupabaseMock({ userData: null });
      render(<UserProfileModal {...baseProps} />);
      expect(await screen.findByText('User not found')).toBeInTheDocument();
    });

    it('shows error message when fetch throws', async () => {
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }));
      render(<UserProfileModal {...baseProps} />);
      expect(await screen.findByText('DB error')).toBeInTheDocument();
    });
  });

  describe('user profile display', () => {
    it('renders username after load', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      expect(await screen.findByText('Alice')).toBeInTheDocument();
    });

    it('renders initials when no profile picture', async () => {
      buildSupabaseMock({ userData: { ...mockUser, username: 'Alice Bob' } });
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice Bob');
      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('renders profile picture when url is provided', async () => {
      buildSupabaseMock({ userData: { ...mockUser, profile_picture_url: 'https://example.com/pic.jpg' } });
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      const img = screen.getByAltText('Alice');
      expect(img.src).toBe('https://example.com/pic.jpg');
    });

    it('shows No reviews yet when no reviews', async () => {
      buildSupabaseMock({ reviewsData: [] });
      render(<UserProfileModal {...baseProps} />);
      expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
    });

    it('shows average rating when reviews exist', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('shows correct review count', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      expect(screen.getByText(/1 review/)).toBeInTheDocument();
    });

    it('uses plural reviews label for multiple reviews', async () => {
      const twoReviews = [
        { ...mockReviews[0], id: 'r1' },
        { ...mockReviews[0], id: 'r2' },
      ];
      buildSupabaseMock({ reviewsData: twoReviews });
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      expect(screen.getByText(/2 reviews/)).toBeInTheDocument();
    });
  });

  describe('transactions section', () => {
    it('renders Transactions component with profile user and compact=true', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      const tx = screen.getByTestId('transactions');
      expect(tx).toBeInTheDocument();
      expect(tx.dataset.userId).toBe('user-123');
      expect(tx.dataset.compact).toBe('true');
    });
  });

  describe('reviews section', () => {
    it('renders review comment', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      expect(await screen.findByText('Great seller!')).toBeInTheDocument();
    });

    it('renders reviewer username', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders listing context', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      expect(await screen.findByText(/"Textbook"/)).toBeInTheDocument();
    });

    it('does not render reviews section when reviews array is empty', async () => {
      buildSupabaseMock({ reviewsData: [] });
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('No reviews yet');
      expect(screen.queryByText('Reviews')).not.toBeInTheDocument();
    });
  });

  describe('close behaviour', () => {
    it('calls onClose when X button is clicked', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      userEvent.click(screen.getByRole('button', { name: /Close/i }));
      await waitFor(() => expect(baseProps.onClose).toHaveBeenCalled());
    });

    it('calls onClose when backdrop is clicked', async () => {
      buildSupabaseMock();
      render(<UserProfileModal {...baseProps} />);
      await screen.findByText('Alice');
      // click the fixed backdrop (first div)
      userEvent.click(document.querySelector('.fixed.inset-0'));
      await waitFor(() => expect(baseProps.onClose).toHaveBeenCalled());
    });
  });
});