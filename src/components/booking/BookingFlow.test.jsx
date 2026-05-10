// src/components/booking/BookingFlow.test.jsx
// 3-step flow: Choose date → Pick slot → Confirm
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingFlow from './BookingFlow';

// ── Mock dependencies ─────────────────────────────────────────────────────
jest.mock('./Calendar', () => ({ selectedDate, onSelect }) => (
  <div data-testid="calendar">
    <button onClick={() => onSelect('2024-09-15')}>Select 2024-09-15</button>
    <button onClick={() => onSelect('2024-09-16')}>Select 2024-09-16</button>
  </div>
));

jest.mock('./SlotPicker', () => ({ slots, selectedSlot, onSelect, loading }) => (
  <div data-testid="slot-picker">
    {loading && <p>Loading slots…</p>}
    {slots?.map(slot => (
      <button
        key={slot}
        onClick={() => onSelect(slot)}
        aria-pressed={selectedSlot === slot}
      >
        {slot}
      </button>
    ))}
  </div>
));

jest.mock('../../hooks/useBookings', () => ({
  useAvailableSlots: () => ({
    slots: ['09:00', '10:00', '11:00'],
    loading: false,
  }),
}));

jest.mock('../../utils/bookingConstants', () => ({
  FACILITY_LOCATION: 'Main Campus Hub',
}));

// ── Fixtures ──────────────────────────────────────────────────────────────
const mockOrders = [
  {
    orderId:    'order-1',
    buyerId:    'buyer-1',
    sellerId:   'seller-1',
    listingId:  'listing-1',
    title:      'Calculus Textbook',
    sellerName: 'Alice',
  },
  {
    orderId:    'order-2',
    buyerId:    'buyer-2',
    sellerId:   'seller-2',
    listingId:  'listing-2',
    title:      'Physics Notes',
    sellerName: 'Bob',
  },
];

const defaultProps = {
  eligibleOrders: mockOrders,
  onConfirm:      jest.fn(),
  submitting:     false,
};

const setup = (props = {}) =>
  render(<BookingFlow {...defaultProps} {...props} />);

beforeEach(() => jest.clearAllMocks());

// ── Helpers ────────────────────────────────────────────────────────────────
// At step 3, both step-2 and step-3 panels are visible simultaneously.
// The summary table is inside the step-3 panel — the last .rounded-2xl card.
const getSummaryPanel = () => {
  const cards = document.querySelectorAll('.rounded-2xl');
  return cards[cards.length - 1];
};

// At step 3, there are two Back buttons (one in step-2 panel, one in step-3).
// The step-3 Back is always the last one in the DOM.
const getStep3BackButton = () => {
  const backs = screen.getAllByRole('button', { name: /Back/i });
  return backs[backs.length - 1];
};

// ===========================================================================
// Empty state
// ===========================================================================
describe('Empty state', () => {
  test('shows empty message when eligibleOrders is empty array', () => {
    setup({ eligibleOrders: [] });
    expect(screen.getByText('No items to drop off')).toBeInTheDocument();
  });

  test('shows descriptive sub-text when no orders', () => {
    setup({ eligibleOrders: [] });
    expect(
      screen.getByText(/Once a purchase is complete and payment confirmed/i)
    ).toBeInTheDocument();
  });

  test('does not render the StepBar when no orders', () => {
    setup({ eligibleOrders: [] });
    expect(screen.queryByText('Choose date')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Step bar
// ===========================================================================
describe('StepBar', () => {
  test('renders all three step labels', () => {
    setup();
    expect(screen.getByText('Choose date')).toBeInTheDocument();
    expect(screen.getByText('Pick slot')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  test('step 1 circle shows "1" on initial render', () => {
    setup();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

// ===========================================================================
// Order selector
// ===========================================================================
describe('Order selector', () => {
  test('renders the order dropdown', () => {
    setup();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('first eligible order is selected by default', () => {
    setup();
    expect(screen.getByRole('combobox')).toHaveValue('order-1');
  });

  test('renders an option for each eligible order', () => {
    setup();
    expect(screen.getAllByRole('option')).toHaveLength(mockOrders.length);
  });

  test('option text includes item title and seller name', () => {
    setup();
    expect(
      screen.getByRole('option', { name: /Calculus Textbook — Alice/i })
    ).toBeInTheDocument();
  });

  test('changing order resets to step 1 and hides slot picker', async () => {
    setup();
    fireEvent.click(screen.getByText('Select 2024-09-15'));
    expect(screen.getByTestId('slot-picker')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'order-2');
    expect(screen.queryByTestId('slot-picker')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Step 1 — Calendar
// ===========================================================================
describe('Step 1 — Calendar', () => {
  test('renders the Calendar component on initial load', () => {
    setup();
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  test('selecting a date advances to step 2 and shows slot picker', () => {
    setup();
    fireEvent.click(screen.getByText('Select 2024-09-15'));
    expect(screen.getByTestId('slot-picker')).toBeInTheDocument();
  });

  test('selecting a date shows the "Available slots for" label', () => {
    setup();
    fireEvent.click(screen.getByText('Select 2024-09-15'));
    expect(screen.getByText(/Available slots for/i)).toBeInTheDocument();
  });
});

// ===========================================================================
// Step 2 — Slot picker
// ===========================================================================
describe('Step 2 — Slot picker', () => {
  const goToStep2 = () => {
    setup();
    fireEvent.click(screen.getByText('Select 2024-09-15'));
  };

  test('renders SlotPicker after date is selected', () => {
    goToStep2();
    expect(screen.getByTestId('slot-picker')).toBeInTheDocument();
  });

  test('Next button is disabled when no slot is selected', () => {
    goToStep2();
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
  });

  test('Next button is enabled after selecting a slot', () => {
    goToStep2();
    fireEvent.click(screen.getByText('09:00'));
    expect(screen.getByRole('button', { name: /Next/i })).not.toBeDisabled();
  });

  test('clicking Next advances to step 3 and shows booking summary', () => {
    goToStep2();
    fireEvent.click(screen.getByText('09:00'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/Booking summary/i)).toBeInTheDocument();
  });

  test('Back button from step 2 hides the slot picker', () => {
    goToStep2();
    // Only one Back button exists at step 2
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.queryByTestId('slot-picker')).not.toBeInTheDocument();
  });

  test('going back then re-selecting date requires slot re-selection before Next', () => {
    goToStep2();
    fireEvent.click(screen.getByText('09:00'));
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    fireEvent.click(screen.getByText('Select 2024-09-15'));
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
  });
});

// ===========================================================================
// Step 3 — Confirm
// ===========================================================================
describe('Step 3 — Confirm', () => {
  const goToStep3 = () => {
    setup();
    fireEvent.click(screen.getByText('Select 2024-09-15'));
    fireEvent.click(screen.getByText('09:00'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  };

  test('renders booking summary section', () => {
    goToStep3();
    expect(screen.getByText(/Booking summary/i)).toBeInTheDocument();
  });

  test('summary shows item title', () => {
    goToStep3();
    // scope to summary panel to avoid ambiguity with the order dropdown
    expect(within(getSummaryPanel()).getByText('Calculus Textbook')).toBeInTheDocument();
  });

  test('summary shows selected time slot', () => {
    goToStep3();
    // "09:00" exists in slot-picker AND summary — scope to summary panel
    expect(within(getSummaryPanel()).getByText('09:00')).toBeInTheDocument();
  });

  test('summary shows facility location', () => {
    goToStep3();
    expect(within(getSummaryPanel()).getByText('Main Campus Hub')).toBeInTheDocument();
  });

  test('summary shows seller name', () => {
    goToStep3();
    expect(within(getSummaryPanel()).getByText('Alice')).toBeInTheDocument();
  });

  test('notes textarea is rendered and accepts input', async () => {
    goToStep3();
    const textarea = screen.getByPlaceholderText(/fragile item/i);
    await userEvent.type(textarea, 'Handle with care');
    expect(textarea).toHaveValue('Handle with care');
  });

  test('notes textarea has maxLength of 500', () => {
    goToStep3();
    expect(screen.getByPlaceholderText(/fragile item/i)).toHaveAttribute('maxLength', '500');
  });

  test('Confirm booking button calls onConfirm with correct payload', () => {
    goToStep3();
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith({
      orderId:   'order-1',
      buyerId:   'buyer-1',
      sellerId:  'seller-1',
      listingId: 'listing-1',
      date:      '2024-09-15',
      timeSlot:  '09:00',
      notes:     '',
    });
  });

  test('button shows "Confirming…" text while submitting', () => {
    // Render already at step 3 manually by reaching step 3 first, then
    // simulate submitting=true via re-render is complex — test via prop
    setup({ submitting: true });
    fireEvent.click(screen.getByText('Select 2024-09-15'));
    fireEvent.click(screen.getByText('09:00'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Confirming…')).toBeInTheDocument();
  });

  test('Confirm booking button is disabled when submitting', () => {
    setup({ submitting: true });
    fireEvent.click(screen.getByText('Select 2024-09-15'));
    fireEvent.click(screen.getByText('09:00'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByRole('button', { name: /Confirming/i })).toBeDisabled();
  });

  test('Back button from step 3 hides booking summary', () => {
    goToStep3();
    // Two Back buttons exist at step 3 — pick the last one (step 3's Back)
    fireEvent.click(getStep3BackButton());
    expect(screen.queryByText(/Booking summary/i)).not.toBeInTheDocument();
  });

  test('Back button from step 3 keeps slot picker visible', () => {
    goToStep3();
    fireEvent.click(getStep3BackButton());
    expect(screen.getByTestId('slot-picker')).toBeInTheDocument();
  });

  test('onConfirm includes notes when provided', async () => {
    goToStep3();
    await userEvent.type(screen.getByPlaceholderText(/fragile item/i), 'Fragile please');
    fireEvent.click(screen.getByRole('button', { name: /Confirm booking/i }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'Fragile please' })
    );
  });
});