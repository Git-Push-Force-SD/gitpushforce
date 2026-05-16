// src/components/booking/StudentBookingDashboard.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudentBookingDashboard from './StudentBookingDashboard';

// ── Mock child components ─────────────────────────────────────────────────
jest.mock('./BookingFlow', () => ({ onConfirm, submitting }) => (
  <div data-testid="booking-flow">
    <button
      onClick={() =>
        onConfirm({
          orderId: 'order-1', buyerId: 'user-123', sellerId: 'seller-1', listingId: 'listing-1',
          date: '2024-09-15', timeSlot: '09:00', notes: '',
        })
      }
    >
      Confirm booking
    </button>
    {submitting && <p>Submitting…</p>}
  </div>
));

jest.mock('./BookingList', () => ({ bookings, loading, error, onCancel }) => (
  <div data-testid="booking-list">
    {loading && <p>Loading bookings…</p>}
    {error && <p>{error}</p>}
    {bookings.map(b => (
      <div key={b.id}>
        <button onClick={() => onCancel(b)}>Cancel {b.id}</button>
      </div>
    ))}
  </div>
));

jest.mock('./CancelModal', () => ({ booking, onConfirm, onClose, loading }) =>
  booking ? (
    <div data-testid="cancel-modal">
      <button onClick={onConfirm}>Confirm cancel</button>
      <button onClick={onClose}>Close modal</button>
      {loading && <p>Cancelling…</p>}
    </div>
  ) : null
);

jest.mock('./BookingFlowTrades', () => ({ eligibleTrades, onConfirm, submitting }) => (
  <div data-testid="booking-flow-trades">
    <button
      onClick={() =>
        onConfirm({ tradeId: 'trade-1', date: '2024-09-15', timeSlot: '10:00', notes: '' })
      }
    >
      Confirm trade booking
    </button>
    {submitting && <p>Submitting…</p>}
  </div>
));

// ── Mock hooks ────────────────────────────────────────────────────────────
const mockRefetch = jest.fn();

jest.mock('../../hooks/useBookings', () => ({
  useBookings:            jest.fn(),
  useEligibleOrders:      jest.fn(),
  useEligibleTrades:      jest.fn(),
  useSellerPendingOrders: jest.fn(),
  createBooking:          jest.fn(),
  createTradeBooking:     jest.fn(),
  cancelBooking:          jest.fn(),
}));

jest.mock('../../AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

import {
  useBookings, useEligibleOrders, useEligibleTrades,
  useSellerPendingOrders, createBooking, createTradeBooking, cancelBooking,
} from '../../hooks/useBookings';

// ── Default hook returns ──────────────────────────────────────────────────
const defaultBookings = { bookings: [], loading: false, error: null, refetch: mockRefetch };
const defaultOrders   = { orders: [{ orderId: 'order-1', buyerId: 'user-123', title: 'Textbook', sellerName: 'Alice' }], loading: false, error: null };
const defaultTrades   = {
  trades: [{
    tradeId: 'trade-1', initiatorId: 'user-123', receiverId: 'partner-1',
    myListingTitle: 'Laptop', partnerListingTitle: 'Phone', partnerName: 'Alice', role: 'initiator',
  }],
  loading: false,
  error: null,
};
const defaultPending  = { pendingOrders: [] };

const setup = (props = {}) => {
  useBookings.mockReturnValue(defaultBookings);
  useEligibleOrders.mockReturnValue(defaultOrders);
  useEligibleTrades.mockReturnValue(defaultTrades);
  useSellerPendingOrders.mockReturnValue(defaultPending);
  return render(<StudentBookingDashboard onClose={jest.fn()} {...props} />);
};

beforeEach(() => jest.clearAllMocks());

// ===========================================================================
// Initial render
// ===========================================================================
describe('Initial render', () => {
  test('renders the Bookings heading', () => {
    setup();
    expect(screen.getByText('Bookings')).toBeInTheDocument();
  });

  test('renders the subtitle', () => {
    setup();
    expect(screen.getByText(/Book a drop-off slot for your item/i)).toBeInTheDocument();
  });

  test('renders both tab buttons', () => {
    setup();
    expect(screen.getByRole('button', { name: /Book a slot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My bookings/i })).toBeInTheDocument();
  });

  test('BookingFlow is visible on initial render', () => {
    setup();
    expect(screen.getByTestId('booking-flow')).toBeInTheDocument();
  });

  test('BookingList is not visible on initial render', () => {
    setup();
    expect(screen.queryByTestId('booking-list')).not.toBeInTheDocument();
  });

  test('CancelModal is not visible on initial render', () => {
    setup();
    expect(screen.queryByTestId('cancel-modal')).not.toBeInTheDocument();
  });

  test('Book a slot tab has active border class', () => {
    setup();
    expect(screen.getByRole('button', { name: /Book a slot/i }).className).toContain('border-dark');
  });
});

// ===========================================================================
// Tab navigation
// ===========================================================================
describe('Tab navigation', () => {
  test('switching to My bookings tab shows BookingList', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    expect(screen.getByTestId('booking-list')).toBeInTheDocument();
  });

  test('switching to My bookings tab hides BookingFlow', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    expect(screen.queryByTestId('booking-flow')).not.toBeInTheDocument();
  });

  test('switching back to Book a slot restores BookingFlow', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    fireEvent.click(screen.getByRole('button', { name: /Book a slot/i }));
    expect(screen.getByTestId('booking-flow')).toBeInTheDocument();
  });

  test('My bookings tab has active border class after click', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    expect(screen.getByRole('button', { name: /My bookings/i }).className).toContain('border-dark');
  });

  test('switching to Trade exchanges tab shows BookingFlowTrades', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Trade exchanges/i }));
    expect(screen.getByTestId('booking-flow-trades')).toBeInTheDocument();
  });
});

// ===========================================================================
// Pending orders banner
// ===========================================================================
describe('Pending orders banner', () => {
  test('does not show banner when pendingOrders is empty', () => {
    setup();
    expect(screen.queryByText(/new order/i)).not.toBeInTheDocument();
  });

  test('shows singular text for one pending order', () => {
    useBookings.mockReturnValue(defaultBookings);
    useEligibleOrders.mockReturnValue(defaultOrders);
    useEligibleTrades.mockReturnValue(defaultTrades);
    useSellerPendingOrders.mockReturnValue({ pendingOrders: [{ id: 'p1' }] });
    render(<StudentBookingDashboard />);
    expect(screen.getByText(/You have 1 new order to drop off/i)).toBeInTheDocument();
  });

  test('shows plural text for multiple pending orders', () => {
    useBookings.mockReturnValue(defaultBookings);
    useEligibleOrders.mockReturnValue(defaultOrders);
    useEligibleTrades.mockReturnValue(defaultTrades);
    useSellerPendingOrders.mockReturnValue({ pendingOrders: [{ id: 'p1' }, { id: 'p2' }] });
    render(<StudentBookingDashboard />);
    expect(screen.getByText(/You have 2 new orders to drop off/i)).toBeInTheDocument();
  });

  test('shows buyer payment instruction in banner', () => {
    useBookings.mockReturnValue(defaultBookings);
    useEligibleOrders.mockReturnValue(defaultOrders);
    useEligibleTrades.mockReturnValue(defaultTrades);
    useSellerPendingOrders.mockReturnValue({ pendingOrders: [{ id: 'p1' }] });
    render(<StudentBookingDashboard />);
    expect(screen.getByText(/A buyer has paid for your item/i)).toBeInTheDocument();
  });
});

// ===========================================================================
// Orders loading spinner
// ===========================================================================
describe('Orders loading state', () => {
  test('shows spinner when ordersLoading is true', () => {
    useBookings.mockReturnValue(defaultBookings);
    useEligibleOrders.mockReturnValue({ orders: [], loading: true, error: null });
    useEligibleTrades.mockReturnValue(defaultTrades);
    useSellerPendingOrders.mockReturnValue(defaultPending);
    const { container } = render(<StudentBookingDashboard />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('hides BookingFlow while orders are loading', () => {
    useBookings.mockReturnValue(defaultBookings);
    useEligibleOrders.mockReturnValue({ orders: [], loading: true, error: null });
    useEligibleTrades.mockReturnValue(defaultTrades);
    useSellerPendingOrders.mockReturnValue(defaultPending);
    render(<StudentBookingDashboard />);
    expect(screen.queryByTestId('booking-flow')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Successful booking
// ===========================================================================
describe('Successful booking', () => {
  beforeEach(() => createBooking.mockResolvedValue({}));

  test('shows success banner after confirming', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => expect(screen.getByText('Booking confirmed!')).toBeInTheDocument());
  });

  test('success banner shows the time slot', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => expect(screen.getByText(/09:00/)).toBeInTheDocument());
  });

  test('hides BookingFlow when success banner is shown', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => screen.getByText('Booking confirmed!'));
    expect(screen.queryByTestId('booking-flow')).not.toBeInTheDocument();
  });

  test('calls refetch after successful booking', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalledTimes(1));
  });

  test('createBooking receives correct payload including buyerId', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith({
        orderId: 'order-1', buyerId: 'user-123', sellerId: 'seller-1',
        listingId: 'listing-1', date: '2024-09-15', timeSlot: '09:00', notes: '',
      })
    );
  });

  test('"Book another slot" dismisses the success banner', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => screen.getByText('Booking confirmed!'));
    fireEvent.click(screen.getByRole('button', { name: /Book another slot/i }));
    expect(screen.queryByText('Booking confirmed!')).not.toBeInTheDocument();
  });

  test('"Book another slot" restores the BookingFlow', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => screen.getByText('Booking confirmed!'));
    fireEvent.click(screen.getByRole('button', { name: /Book another slot/i }));
    expect(screen.getByTestId('booking-flow')).toBeInTheDocument();
  });

  test('"View my bookings" switches to the bookings tab', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => screen.getByText('Booking confirmed!'));
    fireEvent.click(screen.getByRole('button', { name: /View my bookings/i }));
    expect(screen.getByTestId('booking-list')).toBeInTheDocument();
  });
});

// ===========================================================================
// Failed booking
// ===========================================================================
describe('Failed booking', () => {
  test('shows error message when createBooking rejects with message', async () => {
    createBooking.mockRejectedValue(new Error('Network error'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  test('shows fallback error when rejection has no message', async () => {
    createBooking.mockRejectedValue({});
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() =>
      expect(screen.getByText(/Failed to create booking\. Please try again\./i)).toBeInTheDocument()
    );
  });

  test('does not show success banner on failure', async () => {
    createBooking.mockRejectedValue(new Error('Fail'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => screen.getByText('Fail'));
    expect(screen.queryByText('Booking confirmed!')).not.toBeInTheDocument();
  });

  test('BookingFlow stays visible after failure', async () => {
    createBooking.mockRejectedValue(new Error('Fail'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    await waitFor(() => screen.getByText('Fail'));
    expect(screen.getByTestId('booking-flow')).toBeInTheDocument();
  });
});

// ===========================================================================
// Successful trade booking
// ===========================================================================
describe('Successful trade booking', () => {
  beforeEach(() => createBooking.mockResolvedValue({}));

  test('shows success banner after confirming trade booking', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Trade exchanges/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm trade booking/i }));
    await waitFor(() => expect(screen.getByText('Booking confirmed!')).toBeInTheDocument());
  });

  test('createBooking receives trade payload with tradeId', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Trade exchanges/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm trade booking/i }));
    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith({
        bookingType: 'trade',
        tradeId:     'trade-1',
        buyerId:     'user-123',
        sellerId:    'partner-1',
        bookedBy:    'user-123',
        date:        '2024-09-15',
        timeSlot:    '10:00',
        notes:       '',
      })
    );
  });

  test('hides BookingFlowTrades when success banner is shown', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Trade exchanges/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm trade booking/i }));
    await waitFor(() => screen.getByText('Booking confirmed!'));
    expect(screen.queryByTestId('booking-flow-trades')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Cancel booking flow
// ===========================================================================
describe('Cancel booking flow', () => {
  const mockBooking = { id: 'b1', status: 'pending', order_id: 'order-1' };

  beforeEach(() => {
    useBookings.mockReturnValue({ ...defaultBookings, bookings: [mockBooking] });
    useEligibleOrders.mockReturnValue(defaultOrders);
    useEligibleTrades.mockReturnValue(defaultTrades);
    useSellerPendingOrders.mockReturnValue(defaultPending);
    cancelBooking.mockResolvedValue({});
  });

  test('CancelModal opens when cancel is triggered on a booking', () => {
    render(<StudentBookingDashboard onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel b1/i }));
    expect(screen.getByTestId('cancel-modal')).toBeInTheDocument();
  });

  test('closing the modal hides it without cancelling', () => {
    render(<StudentBookingDashboard onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel b1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Close modal/i }));
    expect(screen.queryByTestId('cancel-modal')).not.toBeInTheDocument();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  test('confirming cancel calls cancelBooking with correct args', async () => {
    render(<StudentBookingDashboard onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel b1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm cancel/i }));
    await waitFor(() =>
      expect(cancelBooking).toHaveBeenCalledWith({
        bookingId: 'b1',
        orderId:   'order-1',
        userId:    'user-123',
      })
    );
  });

  test('calls refetch after successful cancel', async () => {
    render(<StudentBookingDashboard onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel b1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm cancel/i }));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  test('modal closes automatically after successful cancel', async () => {
    render(<StudentBookingDashboard onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /My bookings/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel b1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm cancel/i }));
    await waitFor(() =>
      expect(screen.queryByTestId('cancel-modal')).not.toBeInTheDocument()
    );
  });
});
