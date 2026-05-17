import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeCard from './TradeCard';

jest.mock('lucide-react', () => ({ Clock: () => <svg data-testid="clock-icon" /> }));

const baseTrade = {
  id: 'trade-123',
  counterpartyId: 'user-456',
  counterpartyName: 'Alice',
  myListing: { id: 'listing-1', title: 'My Textbook', image_path: null },
  partnerListing: { id: 'listing-2', title: 'Their Laptop' },
  myBooking: null,
};

const baseProps = {
  trade: baseTrade,
  reviewsLoaded: true,
  hasReviewed: false,
  completedTradeBadge: 'badge-completed',
  onOpenProfile: jest.fn(),
  onLeaveReview: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('TradeCard', () => {
  describe('rendering', () => {
    it('renders trade title as both listing titles joined', () => {
      render(<TradeCard {...baseProps} />);
      expect(screen.getByText('My Textbook ↔ Their Laptop')).toBeInTheDocument();
    });

    it('renders fallback title when both listings have no title', () => {
      const trade = { ...baseTrade, myListing: {}, partnerListing: {} };
      render(<TradeCard {...baseProps} trade={trade} />);
      expect(screen.getByText('Trade exchange')).toBeInTheDocument();
    });

    it('renders my listing title', () => {
      render(<TradeCard {...baseProps} />);
      expect(screen.getByText('My Textbook')).toBeInTheDocument();
    });

    it('renders partner listing title', () => {
      render(<TradeCard {...baseProps} />);
      expect(screen.getByText('Their Laptop')).toBeInTheDocument();
    });

    it('renders dash when myListing title is missing', () => {
      const trade = { ...baseTrade, myListing: {} };
      render(<TradeCard {...baseProps} trade={trade} />);
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('renders counterparty name', () => {
      render(<TradeCard {...baseProps} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('renders completed trade badge with provided className', () => {
      render(<TradeCard {...baseProps} />);
      const badge = screen.getByText('Completed Trade');
      expect(badge.className).toContain('badge-completed');
    });

    it('renders fallback image when image_path is null', () => {
      render(<TradeCard {...baseProps} />);
      const img = screen.getByAltText('My Textbook ↔ Their Laptop');
      expect(img.src).toContain('unsplash');
    });

    it('renders supabase image url when image_path is set', () => {
      const trade = { ...baseTrade, myListing: { ...baseTrade.myListing, image_path: 'test/img.jpg' } };
      render(<TradeCard {...baseProps} trade={trade} />);
      const img = screen.getByRole('img');
      expect(img.src).toContain('supabase');
      expect(img.src).toContain('test/img.jpg');
    });
  });

  describe('profile link', () => {
    it('calls onOpenProfile with counterpartyId when partner name clicked', () => {
      render(<TradeCard {...baseProps} />);
      fireEvent.click(screen.getByText('Alice'));
      expect(baseProps.onOpenProfile).toHaveBeenCalledWith('user-456');
    });
  });

  describe('review button', () => {
    it('shows Leave a Review when reviewsLoaded and not reviewed', () => {
      render(<TradeCard {...baseProps} />);
      expect(screen.getByText('Leave a Review')).toBeInTheDocument();
    });

    it('hides Leave a Review when already reviewed', () => {
      render(<TradeCard {...baseProps} hasReviewed={true} />);
      expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument();
    });

    it('hides Leave a Review when reviews not loaded', () => {
      render(<TradeCard {...baseProps} reviewsLoaded={false} />);
      expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument();
    });

    it('calls onLeaveReview with trade when clicked', () => {
      render(<TradeCard {...baseProps} />);
      fireEvent.click(screen.getByText('Leave a Review'));
      expect(baseProps.onLeaveReview).toHaveBeenCalledWith(baseTrade);
    });
  });

  describe('booking slot', () => {
    it('renders booking info when myBooking exists', () => {
      const trade = {
        ...baseTrade,
        myBooking: { date: '2026-05-18', time_slot: '09:00–09:30' },
      };
      render(<TradeCard {...baseProps} trade={trade} />);
      expect(screen.getByText(/Booked for/i)).toBeInTheDocument();
      expect(screen.getByText('09:00–09:30')).toBeInTheDocument();
    });

    it('does not render booking info when myBooking is null', () => {
      render(<TradeCard {...baseProps} />);
      expect(screen.queryByText(/Booked for/i)).not.toBeInTheDocument();
    });

    it('renders clock icon when booking exists', () => {
      const trade = {
        ...baseTrade,
        myBooking: { date: '2026-05-18', time_slot: '10:00–10:30' },
      };
      render(<TradeCard {...baseProps} trade={trade} />);
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });
  });
});