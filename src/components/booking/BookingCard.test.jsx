// src/components/booking/BookingCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import BookingCard from './BookingCard';

// ── Mock dependencies ─────────────────────────────────────────────────────
jest.mock('./StatusTimeline', () => ({ status }) => (
  <div data-testid="status-timeline" data-status={status} />
));

jest.mock('../../utils/bookingConstants', () => ({
  STATUS_META: {
    pending:   { label: 'Pending',   bg: '#FFF3CD', color: '#856404' },
    confirmed: { label: 'Confirmed', bg: '#D4EDDA', color: '#155724' },
    collected: { label: 'Collected', bg: '#EAF3DE', color: '#3B6D11' },
    cancelled: { label: 'Cancelled', bg: '#FCEBEB', color: '#A32D2D' },
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────
const baseBooking = {
  id:        'booking-1',
  status:    'pending',
  date:      '2024-09-15',
  time_slot: '09:00',
  location:  'Main Campus Hub',
  sellerName:'Alice',
  listings:  { title: 'Calculus Textbook', image_path: null },
};

const setup = (props = {}) =>
  render(
    <BookingCard
      booking={baseBooking}
      onCancel={jest.fn()}
      isPast={false}
      {...props}
    />
  );

// ===========================================================================
// Rendering — basic content
// ===========================================================================
describe('Rendering — basic content', () => {
  test('renders the listing title', () => {
    setup();
    expect(screen.getByText('Calculus Textbook')).toBeInTheDocument();
  });

  test('renders the seller name', () => {
    setup();
    expect(screen.getByText(/Seller: Alice/i)).toBeInTheDocument();
  });

  test('renders the location', () => {
    setup();
    expect(screen.getByText('Main Campus Hub')).toBeInTheDocument();
  });

  test('renders the time slot', () => {
    setup();
    expect(screen.getByText(/09:00/i)).toBeInTheDocument();
  });

  test('renders the formatted date', () => {
    setup();
    // Date 2024-09-15 should appear somewhere in the card
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  test('renders status badge with correct label', () => {
    setup();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  test('renders "Item" as fallback title when listings.title is missing', () => {
    setup({ booking: { ...baseBooking, listings: { title: null, image_path: null } } });
    expect(screen.getByText('Item')).toBeInTheDocument();
  });
});

// ===========================================================================
// Status badge variants
// ===========================================================================
describe('Status badge variants', () => {
  test.each([
    ['pending',   'Pending'],
    ['confirmed', 'Confirmed'],
    ['collected', 'Collected'],
    ['cancelled', 'Cancelled'],
  ])('renders correct label for status "%s"', (status, label) => {
    setup({ booking: { ...baseBooking, status } });
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

// ===========================================================================
// Image rendering
// ===========================================================================
describe('Image rendering', () => {
  test('does not render an image when image_path is null', () => {
    setup();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('renders an image when image_path is provided', () => {
    setup({
      booking: {
        ...baseBooking,
        listings: { title: 'Calculus Textbook', image_path: 'textbook.jpg' },
      },
    });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  test('image has correct alt text from listing title', () => {
    setup({
      booking: {
        ...baseBooking,
        listings: { title: 'Calculus Textbook', image_path: 'textbook.jpg' },
      },
    });
    expect(screen.getByAltText('Calculus Textbook')).toBeInTheDocument();
  });

  test('image src contains the supabase storage URL', () => {
    setup({
      booking: {
        ...baseBooking,
        listings: { title: 'Calculus Textbook', image_path: 'textbook.jpg' },
      },
    });
    expect(screen.getByRole('img').src).toContain('supabase.co');
  });
});

// ===========================================================================
// StatusTimeline
// ===========================================================================
describe('StatusTimeline', () => {
  test('renders StatusTimeline for active (non-past) bookings', () => {
    setup({ isPast: false });
    expect(screen.getByTestId('status-timeline')).toBeInTheDocument();
  });

  test('does not render StatusTimeline for past bookings', () => {
    setup({ isPast: true });
    expect(screen.queryByTestId('status-timeline')).not.toBeInTheDocument();
  });

  test('passes correct status to StatusTimeline', () => {
    setup({ booking: { ...baseBooking, status: 'confirmed' } });
    expect(screen.getByTestId('status-timeline')).toHaveAttribute('data-status', 'confirmed');
  });
});

// ===========================================================================
// Cancel button
// ===========================================================================
describe('Cancel button', () => {
  test('renders Cancel booking button for active non-collected bookings', () => {
    setup({ isPast: false, booking: { ...baseBooking, status: 'pending' } });
    expect(screen.getByRole('button', { name: /Cancel booking/i })).toBeInTheDocument();
  });

  test('does not render Cancel button when isPast is true', () => {
    setup({ isPast: true });
    expect(screen.queryByRole('button', { name: /Cancel booking/i })).not.toBeInTheDocument();
  });

  test('does not render Cancel button when status is collected', () => {
    setup({ isPast: false, booking: { ...baseBooking, status: 'collected' } });
    expect(screen.queryByRole('button', { name: /Cancel booking/i })).not.toBeInTheDocument();
  });

  test('calls onCancel with the booking object when clicked', () => {
    const onCancel = jest.fn();
    setup({ onCancel });
    fireEvent.click(screen.getByRole('button', { name: /Cancel booking/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(baseBooking);
  });

  test('renders Cancel button for confirmed status', () => {
    setup({ booking: { ...baseBooking, status: 'confirmed' } });
    expect(screen.getByRole('button', { name: /Cancel booking/i })).toBeInTheDocument();
  });
});

// ===========================================================================
// isPast visual state
// ===========================================================================
describe('isPast visual state', () => {
  test('card has reduced opacity when isPast is true', () => {
    const { container } = setup({ isPast: true });
    expect(container.firstChild).toHaveClass('opacity-60');
  });

  test('card does not have reduced opacity when isPast is false', () => {
    const { container } = setup({ isPast: false });
    expect(container.firstChild).not.toHaveClass('opacity-60');
  });
});

// ===========================================================================
// Missing date fallback
// ===========================================================================
describe('Missing date fallback', () => {
  test('renders dash when date is null', () => {
    setup({ booking: { ...baseBooking, date: null } });
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });
});