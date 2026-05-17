import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OrderCard from './OrderCard';

jest.mock('lucide-react', () => ({ Clock: () => <svg data-testid="clock-icon" /> }));

const baseOrder = {
  id: 'order-123',
  buyer_id: 'buyer-456',
  amount_due: 250,
  status: 'completed',
  buyer_status: 'collected',
  seller_status: 'dropped_off',
  buyerName: 'Alice',
  sellerName: 'Bob',
  listings: {
    id: 'listing-789',
    title: 'Calculus Textbook',
    image_path: null,
    seller_id: 'seller-111',
  },
  bookings: null,
};

const baseProps = {
  order: baseOrder,
  isSelling: false,
  reviewsLoaded: true,
  hasReviewed: false,
  getStatusBadge: (status) => `badge-${status}`,
  getStatusLabel: (status) => status || 'N/A',
  onOpenProfile: jest.fn(),
  onLeaveReview: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('OrderCard', () => {
  describe('rendering', () => {
    it('renders listing title', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.getByText('Calculus Textbook')).toBeInTheDocument();
    });

    it('renders formatted amount due', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.getByText(/R.*250/)).toBeInTheDocument();
    });

    it('renders fallback image when image_path is null', () => {
      render(<OrderCard {...baseProps} />);
      const img = screen.getByAltText('Calculus Textbook');
      expect(img.src).toContain('unsplash');
    });

    it('renders supabase image url when image_path is set', () => {
      const order = { ...baseOrder, listings: { ...baseOrder.listings, image_path: 'test/image.jpg' } };
      render(<OrderCard {...baseProps} order={order} />);
      const img = screen.getByAltText('Calculus Textbook');
      expect(img.src).toContain('supabase');
      expect(img.src).toContain('test/image.jpg');
    });

    it('renders Unknown Item when listing title is missing', () => {
      const order = { ...baseOrder, listings: { ...baseOrder.listings, title: null } };
      render(<OrderCard {...baseProps} order={order} />);
      expect(screen.getByText('Unknown Item')).toBeInTheDocument();
    });
  });

  describe('buyer view', () => {
    it('shows seller name when isSelling is false', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('does not show buyer name when isSelling is false', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('calls onOpenProfile with seller_id when seller name clicked', () => {
      render(<OrderCard {...baseProps} />);
      fireEvent.click(screen.getByText('Bob'));
      expect(baseProps.onOpenProfile).toHaveBeenCalledWith('seller-111');
    });
  });

  describe('seller view', () => {
    it('shows buyer name when isSelling is true', () => {
      render(<OrderCard {...baseProps} isSelling={true} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('calls onOpenProfile with buyer_id when buyer name clicked', () => {
      render(<OrderCard {...baseProps} isSelling={true} />);
      fireEvent.click(screen.getByText('Alice'));
      expect(baseProps.onOpenProfile).toHaveBeenCalledWith('buyer-456');
    });
  });

  describe('review button', () => {
    it('shows Leave a Review when transaction complete and not reviewed', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.getByText('Leave a Review')).toBeInTheDocument();
    });

    it('hides Leave a Review when already reviewed', () => {
      render(<OrderCard {...baseProps} hasReviewed={true} />);
      expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument();
    });

    it('hides Leave a Review when reviews not loaded', () => {
      render(<OrderCard {...baseProps} reviewsLoaded={false} />);
      expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument();
    });

    it('hides Leave a Review when order not completed', () => {
      const order = { ...baseOrder, status: 'pending' };
      render(<OrderCard {...baseProps} order={order} />);
      expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument();
    });

    it('hides Leave a Review when buyer_status is not collected', () => {
      const order = { ...baseOrder, buyer_status: 'ready_for_collection' };
      render(<OrderCard {...baseProps} order={order} />);
      expect(screen.queryByText('Leave a Review')).not.toBeInTheDocument();
    });

    it('calls onLeaveReview with order when clicked', () => {
      render(<OrderCard {...baseProps} />);
      fireEvent.click(screen.getByText('Leave a Review'));
      expect(baseProps.onLeaveReview).toHaveBeenCalledWith(baseOrder);
    });
  });

  describe('booking slot', () => {
    it('renders booking info when booking exists and is not cancelled', () => {
      const order = {
        ...baseOrder,
        bookings: [{ status: 'confirmed', date: '2026-05-18', time_slot: '09:00–09:30' }],
      };
      render(<OrderCard {...baseProps} order={order} />);
      expect(screen.getByText(/Booked for/i)).toBeInTheDocument();
      expect(screen.getByText('09:00–09:30')).toBeInTheDocument();
    });

    it('does not render booking info when bookings is null', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.queryByText(/Booked for/i)).not.toBeInTheDocument();
    });

    it('does not render booking info when booking is cancelled', () => {
      const order = {
        ...baseOrder,
        bookings: [{ status: 'cancelled', date: '2026-05-18', time_slot: '09:00–09:30' }],
      };
      render(<OrderCard {...baseProps} order={order} />);
      expect(screen.queryByText(/Booked for/i)).not.toBeInTheDocument();
    });

    it('uses non-cancelled booking when multiple bookings exist', () => {
      const order = {
        ...baseOrder,
        bookings: [
          { status: 'cancelled', date: '2026-05-17', time_slot: '08:00–08:30' },
          { status: 'confirmed', date: '2026-05-18', time_slot: '10:00–10:30' },
        ],
      };
      render(<OrderCard {...baseProps} order={order} />);
      expect(screen.getByText('10:00–10:30')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('renders order status badge', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.getByText(/status: completed/i)).toBeInTheDocument();
    });

    it('renders buyer collection status badge when not selling', () => {
      render(<OrderCard {...baseProps} />);
      expect(screen.getByText(/Collection:/i)).toBeInTheDocument();
    });

    it('renders seller drop-off status badge when selling', () => {
      render(<OrderCard {...baseProps} isSelling={true} />);
      expect(screen.getByText(/Drop-off:/i)).toBeInTheDocument();
    });
  });
});