import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import PaymentSuccess from './PaymentSuccess';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: ({ size, className }) => (
    <svg data-testid="check-circle-icon" width={size} className={className} />
  ),
  Home: ({ size }) => <svg data-testid="home-icon" width={size} />,
  ShoppingBag: ({ size }) => <svg data-testid="shopping-bag-icon" width={size} />,
}));

describe('PaymentSuccess', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PaymentSuccess />);
    });

    it('displays the "Payment Successful!" heading', () => {
      render(<PaymentSuccess />);
      expect(
        screen.getByRole('heading', { name: /payment successful/i })
      ).toBeInTheDocument();
    });

    it('displays the confirmation description', () => {
      render(<PaymentSuccess />);
      expect(
        screen.getByText(/thank you for your purchase/i)
      ).toBeInTheDocument();
    });

    it('displays the Order Details section heading', () => {
      render(<PaymentSuccess />);
      // Use getByRole with level:3 to target the <h3> specifically,
      // avoiding the false match on the description paragraph that also
      // contains "order details".
      expect(
        screen.getByRole('heading', { level: 3, name: /order details/i })
      ).toBeInTheDocument();
    });

    it('displays Order Status as Confirmed', () => {
      render(<PaymentSuccess />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('displays Currency as ZAR', () => {
      render(<PaymentSuccess />);
      expect(screen.getByText(/ZAR \(South African Rand\)/i)).toBeInTheDocument();
    });

    it('displays Payment Status as Completed', () => {
      render(<PaymentSuccess />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('displays a numeric Transaction ID', () => {
      render(<PaymentSuccess />);
      const transactionId = screen.getByText(/^\d+$/);
      expect(transactionId).toBeInTheDocument();
    });

    it('displays the support email', () => {
      render(<PaymentSuccess />);
      expect(screen.getByText(/support@unimart\.com/i)).toBeInTheDocument();
    });

    it('renders the CheckCircle icon', () => {
      render(<PaymentSuccess />);
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('renders the Back to Dashboard button', () => {
      render(<PaymentSuccess />);
      expect(
        screen.getByRole('button', { name: /back to dashboard/i })
      ).toBeInTheDocument();
    });

    it('renders the Continue Shopping button', () => {
      render(<PaymentSuccess />);
      expect(
        screen.getByRole('button', { name: /continue shopping/i })
      ).toBeInTheDocument();
    });

    it('renders the Home icon', () => {
      render(<PaymentSuccess />);
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    });

    it('renders the ShoppingBag icon', () => {
      render(<PaymentSuccess />);
      expect(screen.getByTestId('shopping-bag-icon')).toBeInTheDocument();
    });
  });

  // ─── Transaction ID ───────────────────────────────────────────────────────────

  describe('Transaction ID', () => {
    it('generates a transaction ID based on current timestamp', () => {
      const before = Date.now();
      render(<PaymentSuccess />);
      const after = Date.now();

      const transactionEl = screen.getByText(/^\d+$/);
      const txId = Number(transactionEl.textContent);

      expect(txId).toBeGreaterThanOrEqual(before);
      expect(txId).toBeLessThanOrEqual(after);
    });

    it('transaction ID is a valid number', () => {
      render(<PaymentSuccess />);
      const transactionEl = screen.getByText(/^\d+$/);
      expect(Number.isFinite(Number(transactionEl.textContent))).toBe(true);
    });
  });

  // ─── Navigation ──────────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('navigates to /studentdashboard when Back to Dashboard is clicked', () => {
      render(<PaymentSuccess />);
      fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/studentdashboard');
    });

    it('navigates to / when Continue Shopping is clicked', () => {
      render(<PaymentSuccess />);
      fireEvent.click(screen.getByRole('button', { name: /continue shopping/i }));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('does not call navigate on initial render', () => {
      render(<PaymentSuccess />);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('each button navigates to its own distinct route', () => {
      render(<PaymentSuccess />);
      fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue shopping/i }));
      expect(mockNavigate).toHaveBeenNthCalledWith(1, '/studentdashboard');
      expect(mockNavigate).toHaveBeenNthCalledWith(2, '/');
    });

    it('calls navigate only once per button click', () => {
      render(<PaymentSuccess />);
      const btn = screen.getByRole('button', { name: /continue shopping/i });
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  // ─── useEffect ───────────────────────────────────────────────────────────────

  describe('useEffect', () => {
    it('does not auto-redirect on mount (timer is commented out)', () => {
      jest.useFakeTimers();
      render(<PaymentSuccess />);
      act(() => jest.advanceTimersByTime(6000));
      expect(mockNavigate).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('useEffect runs without errors on mount', () => {
      expect(() => render(<PaymentSuccess />)).not.toThrow();
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('renders exactly two buttons', () => {
      render(<PaymentSuccess />);
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('heading is accessible by role', () => {
      render(<PaymentSuccess />);
      // Scope to the h1 (level:1) — the component also has an h3 ("Order Details"),
      // so getByRole('heading') without a level would match multiple elements.
      expect(
        screen.getByRole('heading', { level: 1 })
      ).toBeInTheDocument();
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────────

  describe('Snapshot', () => {
    it('matches snapshot', () => {
      // Pin Date.now so the transaction ID is deterministic
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      jest
        .spyOn(Date.prototype, 'getTime')
        .mockReturnValue(mockNow);

      const { container } = render(<PaymentSuccess />);
      expect(container).toMatchSnapshot();

      jest.restoreAllMocks();
    });
  });
});
