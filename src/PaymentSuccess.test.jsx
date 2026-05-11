// src/PaymentSuccess.test.jsx
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaymentSuccess from './PaymentSuccess';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

const { useNavigate } = require('react-router-dom');
const mockNavigate = jest.fn();

const renderComponent = () =>
  render(
    <MemoryRouter>
      <PaymentSuccess />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  useNavigate.mockReturnValue(mockNavigate);
  global.fetch = jest.fn().mockResolvedValue({
    ok:   true,
    text: jest.fn().mockResolvedValue(JSON.stringify({ metadata: { order_id: 'order-1' } })),
  });
  // Reset location to no session_id by default
  delete window.location;
  window.location = new URL('http://localhost/success');
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('PaymentSuccess', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderComponent();
      expect(document.body).toBeInTheDocument();
    });

    it('displays the Payment Successful heading', () => {
      renderComponent();
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    });

    it('displays the confirmation message to the buyer', () => {
      renderComponent();
      expect(screen.getByText(/your payment has been confirmed/i)).toBeInTheDocument();
    });

    it('displays the "What happens next" section', () => {
      renderComponent();
      expect(screen.getByText(/what happens next/i)).toBeInTheDocument();
    });

    it('displays all three next steps', () => {
      renderComponent();
      expect(screen.getByText(/Seller drops off your item/i)).toBeInTheDocument();
      expect(screen.getByText(/Staff confirm the item has been received/i)).toBeInTheDocument();
      expect(screen.getByText(/You collect your item/i)).toBeInTheDocument();
    });

    it('displays step numbers 1, 2, 3', () => {
      const { container } = renderComponent();
      const stepNumbers = container.querySelectorAll('.rounded-full.bg-dark.text-white');
      expect(stepNumbers.length).toBeGreaterThanOrEqual(3);
    });

    it('renders the Back to Dashboard button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('renders only one button', () => {
      renderComponent();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('navigates to /studentdashboard when Back to Dashboard is clicked', () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/studentdashboard');
    });

    it('does not auto-navigate on mount', () => {
      renderComponent();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── Styling ───────────────────────────────────────────────────────────────────

  describe('Styling and Layout', () => {
    it('renders with min-h-screen class', () => {
      const { container } = renderComponent();
      expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
    });

    it('renders the white card container', () => {
      const { container } = renderComponent();
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });

    it('Back to Dashboard button has correct classes', () => {
      renderComponent();
      const btn = screen.getByRole('button', { name: /back to dashboard/i });
      expect(btn).toHaveClass('bg-dark');
      expect(btn).toHaveClass('text-white');
      expect(btn).toHaveClass('rounded-xl');
    });
  });

  // ── markOrderPaid flow ────────────────────────────────────────────────────────

  describe('markOrderPaid flow', () => {
    it('does not call fetch when no session_id in URL', async () => {
      renderComponent();
      await act(async () => await new Promise(r => setTimeout(r, 50)));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls fetch with session_id when present in URL', async () => {
      window.location = new URL('http://localhost/success?session_id=sess_123');
      renderComponent();
      await act(async () => await new Promise(r => setTimeout(r, 50)));
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sess_123')
      );
    });

    it('handles fetch failure gracefully without crashing', async () => {
      window.location = new URL('http://localhost/success?session_id=sess_123');
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      renderComponent();
      await act(async () => await new Promise(r => setTimeout(r, 50)));
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    it('handles missing order_id in metadata gracefully', async () => {
      window.location = new URL('http://localhost/success?session_id=sess_123');
      global.fetch = jest.fn().mockResolvedValue({
        ok:   true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ metadata: {} })),
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      renderComponent();
      await act(async () => await new Promise(r => setTimeout(r, 50)));
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    it('handles non-ok fetch response gracefully', async () => {
      window.location = new URL('http://localhost/success?session_id=sess_123');
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      renderComponent();
      await act(async () => await new Promise(r => setTimeout(r, 50)));
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  // ── Multiple renders ──────────────────────────────────────────────────────────

  describe('Multiple renders', () => {
    it('renders correctly on re-render', () => {
      const { rerender } = renderComponent();
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      rerender(
        <MemoryRouter>
          <PaymentSuccess />
        </MemoryRouter>
      );
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    });
  });
});