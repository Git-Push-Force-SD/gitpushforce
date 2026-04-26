// src/components/booking/BookingList.test.jsx
import { render, screen, within } from '@testing-library/react';
import BookingList from './BookingList';

// ── Mock BookingCard so we isolate BookingList logic ─────────────────────
jest.mock('./BookingCard', () => ({ booking, isPast }) => (
  <div
    data-testid="booking-card"
    data-booking-id={booking.id}
    data-is-past={String(isPast)}
  >
    {booking.listings?.title}
  </div>
));

// ── Fixtures ──────────────────────────────────────────────────────────────
const makeBooking = (id, status) => ({
  id,
  status,
  date:      '2024-09-15',
  time_slot: '09:00',
  location:  'Main Campus Hub',
  sellerName:'Alice',
  listings:  { title: `Item ${id}`, image_path: null },
});

const upcomingBooking  = makeBooking('b1', 'pending');
const confirmedBooking = makeBooking('b2', 'confirmed');
const collectedBooking = makeBooking('b3', 'collected');
const cancelledBooking = makeBooking('b4', 'cancelled');

const setup = (props = {}) =>
  render(
    <BookingList
      bookings={[]}
      loading={false}
      error={null}
      onCancel={jest.fn()}
      {...props}
    />
  );

// ===========================================================================
// Loading state
// ===========================================================================
describe('Loading state', () => {
  test('renders three skeleton pulse placeholders when loading', () => {
    const { container } = setup({ loading: true });
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });

  test('does not render booking cards while loading', () => {
    setup({ loading: true });
    expect(screen.queryByTestId('booking-card')).not.toBeInTheDocument();
  });

  test('does not render empty state while loading', () => {
    setup({ loading: true });
    expect(screen.queryByText(/No bookings yet/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Error state
// ===========================================================================
describe('Error state', () => {
  test('renders the error message when error prop is provided', () => {
    setup({ error: 'Failed to load bookings' });
    expect(screen.getByText('Failed to load bookings')).toBeInTheDocument();
  });

  test('does not render booking cards on error', () => {
    setup({ error: 'Something went wrong' });
    expect(screen.queryByTestId('booking-card')).not.toBeInTheDocument();
  });

  test('does not render empty state on error', () => {
    setup({ error: 'Something went wrong' });
    expect(screen.queryByText(/No bookings yet/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Empty state
// ===========================================================================
describe('Empty state', () => {
  test('renders "No bookings yet." when bookings array is empty', () => {
    setup({ bookings: [] });
    expect(screen.getByText('No bookings yet.')).toBeInTheDocument();
  });

  test('renders sub-text prompt to book a slot', () => {
    setup({ bookings: [] });
    expect(
      screen.getByText(/Book a drop-off slot to get started\./i)
    ).toBeInTheDocument();
  });

  test('does not render any booking cards in empty state', () => {
    setup({ bookings: [] });
    expect(screen.queryByTestId('booking-card')).not.toBeInTheDocument();
  });

  test('does not render Upcoming or Past section headings in empty state', () => {
    setup({ bookings: [] });
    expect(screen.queryByText(/Upcoming/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Past/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Upcoming section
// ===========================================================================
describe('Upcoming section', () => {
  test('renders Upcoming section heading when pending bookings exist', () => {
    setup({ bookings: [upcomingBooking] });
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  test('renders Upcoming section heading when confirmed bookings exist', () => {
    setup({ bookings: [confirmedBooking] });
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  test('renders correct number of cards in Upcoming section', () => {
    setup({ bookings: [upcomingBooking, confirmedBooking] });
    const cards = screen.getAllByTestId('booking-card');
    expect(cards).toHaveLength(2);
  });

  test('upcoming cards are rendered with isPast=false', () => {
    setup({ bookings: [upcomingBooking] });
    expect(screen.getByTestId('booking-card')).toHaveAttribute('data-is-past', 'false');
  });

  test('does not render Upcoming heading when no active bookings', () => {
    setup({ bookings: [collectedBooking, cancelledBooking] });
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Past section
// ===========================================================================
describe('Past section', () => {
  test('renders Past section heading when collected bookings exist', () => {
    setup({ bookings: [collectedBooking] });
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  test('renders Past section heading when cancelled bookings exist', () => {
    setup({ bookings: [cancelledBooking] });
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  test('past cards are rendered with isPast=true', () => {
    setup({ bookings: [collectedBooking] });
    expect(screen.getByTestId('booking-card')).toHaveAttribute('data-is-past', 'true');
  });

  test('does not render Past heading when no past bookings', () => {
    setup({ bookings: [upcomingBooking] });
    expect(screen.queryByText('Past')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Mixed bookings — upcoming + past together
// ===========================================================================
describe('Mixed bookings', () => {
  const allBookings = [
    upcomingBooking,
    confirmedBooking,
    collectedBooking,
    cancelledBooking,
  ];

  test('renders both Upcoming and Past sections', () => {
    setup({ bookings: allBookings });
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  test('renders correct total number of booking cards', () => {
    setup({ bookings: allBookings });
    expect(screen.getAllByTestId('booking-card')).toHaveLength(4);
  });

  test('collected booking is in Past section with isPast=true', () => {
    setup({ bookings: allBookings });
    const pastSection = screen.getByText('Past').closest('section');
    const pastCards   = within(pastSection).getAllByTestId('booking-card');
    expect(pastCards.some(c => c.getAttribute('data-booking-id') === 'b3')).toBe(true);
  });

  test('pending booking is in Upcoming section with isPast=false', () => {
    setup({ bookings: allBookings });
    const upcomingSection = screen.getByText('Upcoming').closest('section');
    const upcomingCards   = within(upcomingSection).getAllByTestId('booking-card');
    expect(upcomingCards.some(c => c.getAttribute('data-booking-id') === 'b1')).toBe(true);
  });
});