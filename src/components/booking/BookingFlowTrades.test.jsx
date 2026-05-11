// src/components/booking/BookingFlowTrades.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingFlowTrades from './BookingFlowTrades';

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('./Calendar', () => ({ selectedDate, onSelect }) => (
  <div data-testid="calendar">
    <button onClick={() => onSelect('2026-06-15')}>Select date</button>
    {selectedDate && <p>Selected: {selectedDate}</p>}
  </div>
));

jest.mock('./SlotPicker', () => ({ slots, selectedSlot, onSelect, loading }) => (
  <div data-testid="slot-picker">
    {loading && <p>Loading slots…</p>}
    {slots.map(s => (
      <button
        key={s.timeSlot}
        onClick={() => onSelect(s.timeSlot)}
        className={selectedSlot === s.timeSlot ? 'selected' : ''}
      >
        {s.timeSlot}
      </button>
    ))}
  </div>
));

jest.mock('../../hooks/useBookings', () => ({
  useAvailableSlots: jest.fn(),
}));

jest.mock('../../utils/bookingConstants', () => ({
  FACILITY_LOCATION: 'Trade Facility — Room 2B',
}));

import { useAvailableSlots } from '../../hooks/useBookings';

const mockSlots = [
  { timeSlot: '09:00–09:30', capacity: 5, taken: 1, available: true },
  { timeSlot: '10:00–10:30', capacity: 5, taken: 0, available: true },
];

const mockTrades = [
  {
    tradeId: 'trade-1',
    myListingTitle: 'Laptop',
    partnerListingTitle: 'Phone',
    partnerName: 'Alice',
    role: 'initiator',
  },
  {
    tradeId: 'trade-2',
    myListingTitle: 'Textbook',
    partnerListingTitle: 'Calculator',
    partnerName: 'Bob',
    role: 'receiver',
  },
];

const setup = (props = {}) => {
  useAvailableSlots.mockReturnValue({ slots: mockSlots, loading: false });
  return render(
    <BookingFlowTrades
      eligibleTrades={mockTrades}
      onConfirm={jest.fn()}
      submitting={false}
      {...props}
    />
  );
};

beforeEach(() => jest.clearAllMocks());

// ===========================================================================
// Empty state
// ===========================================================================
describe('Empty state', () => {
  test('shows no trades message when eligibleTrades is empty', () => {
    useAvailableSlots.mockReturnValue({ slots: [], loading: false });
    render(<BookingFlowTrades eligibleTrades={[]} onConfirm={jest.fn()} submitting={false} />);
    expect(screen.getByText('No trades to exchange')).toBeInTheDocument();
  });

  test('shows explanation text when no trades', () => {
    useAvailableSlots.mockReturnValue({ slots: [], loading: false });
    render(<BookingFlowTrades eligibleTrades={[]} onConfirm={jest.fn()} submitting={false} />);
    expect(screen.getByText(/accepted trades awaiting a drop-off/i)).toBeInTheDocument();
  });
});

// ===========================================================================
// Initial render
// ===========================================================================
describe('Initial render', () => {
  test('renders step bar with step 1 active', () => {
    setup();
    expect(screen.getByText('Choose date')).toBeInTheDocument();
    expect(screen.getByText('Pick slot')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  test('renders trade selector dropdown', () => {
    setup();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('dropdown shows first trade by default', () => {
    setup();
    expect(screen.getByText(/Your: Laptop ↔ Alice: Phone/)).toBeInTheDocument();
  });

  test('dropdown shows all eligible trades', () => {
    setup();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
  });

  test('renders calendar on step 1', () => {
    setup();
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  test('slot picker is not shown on step 1', () => {
    setup();
    expect(screen.queryByTestId('slot-picker')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Step navigation
// ===========================================================================
describe('Step navigation', () => {
  test('selecting a date advances to step 2', () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    expect(screen.getByTestId('slot-picker')).toBeInTheDocument();
  });

  test('slot picker shows after date selection', async () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    await waitFor(() => {
      expect(screen.getByText('09:00–09:30')).toBeInTheDocument();
    });
  });

  test('Back button on step 2 returns to step 1', () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.queryByTestId('slot-picker')).not.toBeInTheDocument();
  });

  test('Next button is disabled when no slot selected', () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
  });

  test('Next button is enabled after slot is selected', () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('09:00–09:30'));
    expect(screen.getByRole('button', { name: /Next/i })).not.toBeDisabled();
  });

  test('clicking Next advances to step 3', () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('09:00–09:30'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Drop-off booking summary')).toBeInTheDocument();
  });

  test('Back button on step 3 returns to step 2', () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('09:00–09:30'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    // There are two Back buttons (step2 and step3) — click the last one
    const backButtons = screen.getAllByText('Back');
    fireEvent.click(backButtons[backButtons.length - 1]);
    expect(screen.queryByText('Drop-off booking summary')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Confirmation summary
// ===========================================================================
describe('Confirmation summary', () => {
  const advanceToStep3 = () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('09:00–09:30'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  };

  test('shows my listing title in summary', () => {
    advanceToStep3();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
  });

  test('shows partner listing title in summary', () => {
    advanceToStep3();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  test('shows partner name in summary', () => {
    advanceToStep3();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  test('shows facility location in summary', () => {
    advanceToStep3();
    expect(screen.getByText('Trade Facility — Room 2B')).toBeInTheDocument();
  });

  test('shows selected time slot in summary', () => {
    advanceToStep3();
    expect(screen.getAllByText('09:00–09:30').length).toBeGreaterThan(0);
  });

  test('renders notes textarea', () => {
    advanceToStep3();
    expect(screen.getByPlaceholderText(/fragile item/i)).toBeInTheDocument();
  });

  test('Confirm drop-off button is present', () => {
    advanceToStep3();
    expect(screen.getByRole('button', { name: /Confirm drop-off/i })).toBeInTheDocument();
  });
});

// ===========================================================================
// Submission
// ===========================================================================
describe('Submission', () => {
  test('calls onConfirm with correct payload', () => {
    const onConfirm = jest.fn();
    useAvailableSlots.mockReturnValue({ slots: mockSlots, loading: false });
    render(
      <BookingFlowTrades
        eligibleTrades={mockTrades}
        onConfirm={onConfirm}
        submitting={false}
      />
    );
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('09:00–09:30'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm drop-off/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      tradeId:  'trade-1',
      date:     '2026-06-15',
      timeSlot: '09:00–09:30',
      notes:    '',
    });
  });

  test('includes notes in payload when filled in', () => {
    const onConfirm = jest.fn();
    useAvailableSlots.mockReturnValue({ slots: mockSlots, loading: false });
    render(
      <BookingFlowTrades
        eligibleTrades={mockTrades}
        onConfirm={onConfirm}
        submitting={false}
      />
    );
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('09:00–09:30'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.change(screen.getByPlaceholderText(/fragile item/i), {
      target: { value: 'handle with care' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm drop-off/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      tradeId:  'trade-1',
      date:     '2026-06-15',
      timeSlot: '09:00–09:30',
      notes:    'handle with care',
    });
  });

  test('Confirm drop-off button is disabled while submitting', () => {
    useAvailableSlots.mockReturnValue({ slots: mockSlots, loading: false });
    render(
      <BookingFlowTrades
        eligibleTrades={mockTrades}
        onConfirm={jest.fn()}
        submitting={true}
      />
    );
    fireEvent.click(screen.getByText('Select date'));
    fireEvent.click(screen.getByText('09:00–09:30'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByRole('button', { name: /Confirming/i })).toBeDisabled();
  });
});

// ===========================================================================
// Trade selector
// ===========================================================================
describe('Trade selector', () => {
  test('changing trade resets date and slot selection', () => {
    setup();
    fireEvent.click(screen.getByText('Select date'));
    expect(screen.getByTestId('slot-picker')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'trade-2' } });
    expect(screen.queryByTestId('slot-picker')).not.toBeInTheDocument();
  });

  test('changing trade updates the selected trade', () => {
    setup();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'trade-2' } });
    expect(screen.getByText(/Your: Textbook ↔ Bob: Calculator/)).toBeInTheDocument();
  });
});

// ===========================================================================
// Slots loading
// ===========================================================================
describe('Slots loading state', () => {
  test('shows loading indicator while slots are loading', () => {
    useAvailableSlots.mockReturnValue({ slots: [], loading: true });
    render(
      <BookingFlowTrades
        eligibleTrades={mockTrades}
        onConfirm={jest.fn()}
        submitting={false}
      />
    );
    fireEvent.click(screen.getByText('Select date'));
    expect(screen.getByText('Loading slots…')).toBeInTheDocument();
  });
});
