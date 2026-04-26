// src/components/booking/CancelModal.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import CancelModal from './CancelModal';

const baseBooking = {
  id:        'booking-1',
  date:      '2024-09-15',
  time_slot: '09:00',
  listings:  { title: 'Calculus Textbook' },
};

const setup = (props = {}) =>
  render(
    <CancelModal
      booking={baseBooking}
      onConfirm={jest.fn()}
      onClose={jest.fn()}
      loading={false}
      {...props}
    />
  );

// ===========================================================================
// Null guard
// ===========================================================================
describe('Null guard', () => {
  test('renders nothing when booking is null', () => {
    const { container } = render(
      <CancelModal booking={null} onConfirm={jest.fn()} onClose={jest.fn()} loading={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing when booking is undefined', () => {
    const { container } = render(
      <CancelModal booking={undefined} onConfirm={jest.fn()} onClose={jest.fn()} loading={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

// ===========================================================================
// Content rendering
// ===========================================================================
describe('Content rendering', () => {
  test('renders the cancel confirmation heading', () => {
    setup();
    expect(screen.getByText('Cancel this booking?')).toBeInTheDocument();
  });

  test('renders the listing title', () => {
    setup();
    expect(screen.getByText('Calculus Textbook')).toBeInTheDocument();
  });

  test('renders the booking date', () => {
    setup();
    expect(screen.getByText(/2024-09-15/)).toBeInTheDocument();
  });

  test('renders the time slot', () => {
    setup();
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  test('renders the warning text about the action being irreversible', () => {
    setup();
    expect(screen.getByText(/This cannot be undone/i)).toBeInTheDocument();
  });

  test('renders Keep booking button', () => {
    setup();
    expect(screen.getByRole('button', { name: /Keep booking/i })).toBeInTheDocument();
  });

  test('renders Yes, cancel button', () => {
    setup();
    expect(screen.getByRole('button', { name: /Yes, cancel/i })).toBeInTheDocument();
  });
});

// ===========================================================================
// Button interactions
// ===========================================================================
describe('Button interactions', () => {
  test('clicking Keep booking calls onClose', () => {
    const onClose = jest.fn();
    setup({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /Keep booking/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('clicking Yes, cancel calls onConfirm', () => {
    const onConfirm = jest.fn();
    setup({ onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /Yes, cancel/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('clicking the X close button calls onClose', () => {
    const onClose = jest.fn();
    setup({ onClose });
    // X button is the third button (after Keep and Yes cancel)
    const buttons = screen.getAllByRole('button');
    const xButton = buttons.find(b => b.querySelector('svg'));
    fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });
});

// ===========================================================================
// Loading state
// ===========================================================================
describe('Loading state', () => {
  test('shows "Cancelling…" text while loading', () => {
    setup({ loading: true });
    expect(screen.getByText('Cancelling…')).toBeInTheDocument();
  });

  test('Keep booking button is disabled while loading', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: /Keep booking/i })).toBeDisabled();
  });

  test('Yes, cancel button is disabled while loading', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: /Cancelling…/i })).toBeDisabled();
  });

  test('shows "Yes, cancel" text when not loading', () => {
    setup({ loading: false });
    expect(screen.getByText('Yes, cancel')).toBeInTheDocument();
  });
});


// =============================================================================
// src/components/booking/SlotPicker.test.jsx
// =============================================================================
import SlotPicker from './SlotPicker';

const availableSlots = [
  { timeSlot: '09:00', available: true,  capacity: 5, taken: 2 },
  { timeSlot: '10:00', available: true,  capacity: 5, taken: 4 },
  { timeSlot: '11:00', available: false, capacity: 5, taken: 5 },
];

const setupSlot = (props = {}) =>
  render(
    <SlotPicker
      slots={availableSlots}
      selectedSlot={null}
      onSelect={jest.fn()}
      loading={false}
      {...props}
    />
  );

describe('SlotPicker — Loading state', () => {
  test('renders 9 skeleton placeholders when loading', () => {
    const { container } = setupSlot({ loading: true });
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(9);
  });

  test('does not render slot buttons while loading', () => {
    setupSlot({ loading: true });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('SlotPicker — Empty state', () => {
  test('shows no slots message when slots array is empty', () => {
    setupSlot({ slots: [] });
    expect(screen.getByText(/No slots available for this date/i)).toBeInTheDocument();
  });

  test('shows no slots message when slots is null', () => {
    setupSlot({ slots: null });
    expect(screen.getByText(/No slots available for this date/i)).toBeInTheDocument();
  });
});

describe('SlotPicker — Slot rendering', () => {
  test('renders a button for each slot', () => {
    setupSlot();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  test('renders the time label for each slot', () => {
    setupSlot();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
  });

  test('renders remaining capacity for available slots', () => {
    setupSlot();
    expect(screen.getByText('3 left')).toBeInTheDocument(); // 09:00: 5-2
    expect(screen.getByText('1 left')).toBeInTheDocument(); // 10:00: 5-4
  });

  test('renders "Full" label for unavailable slots', () => {
    setupSlot();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });

  test('full slots are disabled', () => {
    setupSlot();
    const buttons = screen.getAllByRole('button');
    const fullBtn = buttons.find(b => b.textContent.includes('Full'));
    expect(fullBtn).toBeDisabled();
  });

  test('available slots are not disabled', () => {
    setupSlot();
    const buttons = screen.getAllByRole('button');
    const availBtn = buttons.find(b => b.textContent.includes('3 left'));
    expect(availBtn).not.toBeDisabled();
  });
});

describe('SlotPicker — Selection', () => {
  test('clicking an available slot calls onSelect with timeSlot string', () => {
    const onSelect = jest.fn();
    setupSlot({ onSelect });
    fireEvent.click(screen.getAllByRole('button')[0]); // 09:00
    expect(onSelect).toHaveBeenCalledWith('09:00');
  });

  test('clicking a full slot does not call onSelect', () => {
    const onSelect = jest.fn();
    setupSlot({ onSelect });
    const fullBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Full'));
    fireEvent.click(fullBtn);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('selected slot has active bg-dark styling', () => {
    setupSlot({ selectedSlot: '09:00' });
    const buttons = screen.getAllByRole('button');
    const selected = buttons.find(b => b.textContent.includes('09:00'));
    expect(selected.className).toContain('bg-dark');
  });

  test('non-selected slot does not have bg-dark styling', () => {
    setupSlot({ selectedSlot: '09:00' });
    const buttons = screen.getAllByRole('button');
    const other = buttons.find(b => b.textContent.includes('10:00'));
    expect(other.className).not.toContain('bg-dark');
  });
});


// =============================================================================
// src/components/booking/StatusTimeline.test.jsx
// =============================================================================
import StatusTimeline from './StatusTimeline';

jest.mock('../../utils/bookingConstants', () => ({
  TIMELINE_STEPS: [
    { key: 'pending',   label: 'Pending'   },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'dropped',   label: 'Dropped'   },
    { key: 'collected', label: 'Collected' },
  ],
}));

const setupTimeline = (status = 'pending') =>
  render(<StatusTimeline status={status} />);

describe('StatusTimeline — Step labels', () => {
  test('renders all step labels', () => {
    setupTimeline('pending');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Dropped')).toBeInTheDocument();
    expect(screen.getByText('Collected')).toBeInTheDocument();
  });
});

describe('StatusTimeline — Active step styling', () => {
  test('active step (pending) dot has dark background', () => {
    const { container } = setupTimeline('pending');
    const dots = container.querySelectorAll('.rounded-full');
    // First dot should be active (#1a1a1a)
    expect(dots[0].style.background).toBe('rgb(26, 26, 26)');
  });

  test('done steps have green dot color', () => {
    const { container } = setupTimeline('confirmed');
    const dots = container.querySelectorAll('.rounded-full');
    // First dot (pending) is done — should be green
    expect(dots[0].style.background).toBe('rgb(29, 158, 117)');
  });

  test('future steps have gray dot color', () => {
    const { container } = setupTimeline('pending');
    const dots = container.querySelectorAll('.rounded-full');
    // Second dot (confirmed) is future — should be gray
    expect(dots[1].style.background).toBe('rgb(209, 213, 219)');
  });
});

describe('StatusTimeline — All status variants render', () => {
  test.each(['pending', 'confirmed', 'dropped', 'collected'])(
    'renders without crashing for status "%s"',
    (status) => {
      expect(() => setupTimeline(status)).not.toThrow();
    }
  );
});