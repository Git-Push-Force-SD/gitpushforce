import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import PaymentCancel from './PaymentCancel';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  XCircle: ({ size, className }) => (
    <svg data-testid="x-circle-icon" width={size} className={className} />
  ),
  Home: ({ size }) => <svg data-testid="home-icon" width={size} />,
  ArrowLeft: ({ size }) => <svg data-testid="arrow-left-icon" width={size} />,
}));

describe('PaymentCancel', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PaymentCancel />);
    });

    it('displays the "Payment Cancelled" heading', () => {
      render(<PaymentCancel />);
      expect(
        screen.getByRole('heading', { name: /payment cancelled/i })
      ).toBeInTheDocument();
    });

    it('displays the cancellation description', () => {
      render(<PaymentCancel />);
      expect(
        screen.getByText(/your payment was cancelled/i)
      ).toBeInTheDocument();
    });

    it('displays the tip info box', () => {
      render(<PaymentCancel />);
      expect(
        screen.getByText(/save items to your wishlist/i)
      ).toBeInTheDocument();
    });

    it('displays the support email', () => {
      render(<PaymentCancel />);
      expect(screen.getByText(/support@unimart\.com/i)).toBeInTheDocument();
    });

    it('renders the XCircle icon', () => {
      render(<PaymentCancel />);
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('renders the Go Back button', () => {
      render(<PaymentCancel />);
      expect(
        screen.getByRole('button', { name: /go back/i })
      ).toBeInTheDocument();
    });

    it('renders the Back to Dashboard button', () => {
      render(<PaymentCancel />);
      expect(
        screen.getByRole('button', { name: /back to dashboard/i })
      ).toBeInTheDocument();
    });

    it('renders the ArrowLeft icon inside the Go Back button', () => {
      render(<PaymentCancel />);
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
    });

    it('renders the Home icon inside the Back to Dashboard button', () => {
      render(<PaymentCancel />);
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    });
  });

  // ─── Navigation ──────────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('calls navigate(-1) when Go Back is clicked', () => {
      render(<PaymentCancel />);
      fireEvent.click(screen.getByRole('button', { name: /go back/i }));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('navigates to /studentdashboard when Back to Dashboard is clicked', () => {
      render(<PaymentCancel />);
      fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/studentdashboard');
    });

    it('does not call navigate on initial render', () => {
      render(<PaymentCancel />);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls navigate only once per button click', () => {
      render(<PaymentCancel />);
      const goBackBtn = screen.getByRole('button', { name: /go back/i });
      fireEvent.click(goBackBtn);
      fireEvent.click(goBackBtn);
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('buttons are accessible by role', () => {
      render(<PaymentCancel />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('heading is present and accessible', () => {
      render(<PaymentCancel />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────────

  describe('Snapshot', () => {
    it('matches snapshot', () => {
      const { container } = render(<PaymentCancel />);
      expect(container).toMatchSnapshot();
    });
  });
});
