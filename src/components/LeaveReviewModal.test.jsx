import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeaveReviewModal from './LeaveReviewModal';

const baseProps = {
  isOpen: true,
  onClose: jest.fn(),
  transactionType: 'order',
  transactionId: 'order-123',
  listingId: 'listing-123',
  revieweeId: 'user-456',
  revieweeName: 'John Doe',
  submitReview: jest.fn(),
  reviewerId: 'user-789',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LeaveReviewModal', () => {
  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<LeaveReviewModal {...baseProps} isOpen={false} />);
      expect(screen.queryByText(/Leave a Review/i)).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(<LeaveReviewModal {...baseProps} />);
      expect(screen.getByText(/Leave a Review for John Doe/i)).toBeInTheDocument();
    });

    it('renders 5 star buttons', () => {
      render(<LeaveReviewModal {...baseProps} />);
      expect(screen.getAllByRole('button', { name: /Rate \d star/i })).toHaveLength(5);
    });

    it('renders comment textarea', () => {
      render(<LeaveReviewModal {...baseProps} />);
      expect(screen.getByPlaceholderText(/Share your experience/i)).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<LeaveReviewModal {...baseProps} />);
      expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  describe('star rating', () => {
    it('shows error if submitted with no rating', async () => {
      render(<LeaveReviewModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));
      expect(await screen.findByText(/Please select a rating/i)).toBeInTheDocument();
    });

    it('shows rating label after selecting a star', () => {
      render(<LeaveReviewModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Rate 3 stars/i }));
      expect(screen.getByText(/3 out of 5 stars/i)).toBeInTheDocument();
    });
  });

  describe('comment input', () => {
    it('updates character count as user types', () => {
      render(<LeaveReviewModal {...baseProps} />);
      const textarea = screen.getByPlaceholderText(/Share your experience/i);
      fireEvent.change(textarea, { target: { value: 'Great seller!' } });
      expect(screen.getByText(/13\/500 characters/i)).toBeInTheDocument();
    });
  });

  describe('submission', () => {
    it('calls submitReview with correct data for an order', async () => {
      baseProps.submitReview.mockResolvedValueOnce();
      render(<LeaveReviewModal {...baseProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Rate 4 stars/i }));
      fireEvent.change(screen.getByPlaceholderText(/Share your experience/i), {
        target: { value: 'Good transaction' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      await waitFor(() => {
        expect(baseProps.submitReview).toHaveBeenCalledWith({
          reviewer_id: 'user-789',
          reviewee_id: 'user-456',
          listing_id: 'listing-123',
          rating: 4,
          comment: 'Good transaction',
          order_id: 'order-123',
        });
      });
    });

    it('calls submitReview with trade_id for a trade', async () => {
      baseProps.submitReview.mockResolvedValueOnce();
      render(<LeaveReviewModal {...baseProps} transactionType="trade" transactionId="trade-999" />);

      fireEvent.click(screen.getByRole('button', { name: /Rate 5 stars/i }));
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      await waitFor(() => {
        expect(baseProps.submitReview).toHaveBeenCalledWith(
          expect.objectContaining({ trade_id: 'trade-999' })
        );
        expect(baseProps.submitReview).not.toHaveBeenCalledWith(
          expect.objectContaining({ order_id: expect.anything() })
        );
      });
    });

    it('passes null comment when comment is empty', async () => {
      baseProps.submitReview.mockResolvedValueOnce();
      render(<LeaveReviewModal {...baseProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Rate 2 stars/i }));
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      await waitFor(() => {
        expect(baseProps.submitReview).toHaveBeenCalledWith(
          expect.objectContaining({ comment: null })
        );
      });
    });

    it('shows success message after successful submission', async () => {
      baseProps.submitReview.mockResolvedValueOnce();
      render(<LeaveReviewModal {...baseProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Rate 5 stars/i }));
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      expect(await screen.findByText(/Review submitted successfully/i)).toBeInTheDocument();
    });

    it('shows duplicate review error on unique constraint violation', async () => {
      baseProps.submitReview.mockRejectedValueOnce({ code: '23505' });
      render(<LeaveReviewModal {...baseProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Rate 3 stars/i }));
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      expect(await screen.findByText(/already reviewed/i)).toBeInTheDocument();
    });

    it('shows generic error message on failure', async () => {
      baseProps.submitReview.mockRejectedValueOnce(new Error('Network error'));
      render(<LeaveReviewModal {...baseProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Rate 1 stars/i }));
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      expect(await screen.findByText(/Network error/i)).toBeInTheDocument();
    });
  });

  describe('close behaviour', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(<LeaveReviewModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(baseProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      render(<LeaveReviewModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Close/i }));
      expect(baseProps.onClose).toHaveBeenCalled();
    });

    it('resets state when closed', () => {
      render(<LeaveReviewModal {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Rate 4 stars/i }));
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(baseProps.onClose).toHaveBeenCalled();
    });
  });
});