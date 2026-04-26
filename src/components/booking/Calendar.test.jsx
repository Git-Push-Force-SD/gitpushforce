// src/components/booking/Calendar.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Calendar from './Calendar';

// ── Helpers ───────────────────────────────────────────────────────────────
const setup = (props = {}) =>
  render(<Calendar selectedDate={null} onSelect={jest.fn()} {...props} />);

// Fix "today" so tests are date-independent
const FIXED_DATE = new Date(2024, 8, 11); // Wednesday 11 Sep 2024
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_DATE);
});
afterAll(() => jest.useRealTimers());

// ===========================================================================
// Static structure
// ===========================================================================
describe('Static structure', () => {
  test('renders all 7 day-of-week headers', () => {
    setup();
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(d =>
      expect(screen.getByText(d)).toBeInTheDocument()
    );
  });

  test('renders the current month and year on load', () => {
    setup();
    expect(screen.getByText('September 2024')).toBeInTheDocument();
  });

  test('renders previous month navigation button', () => {
    setup();
    // Two chevron buttons exist — left and right
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeInTheDocument();
  });

  test('renders next month navigation button', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toBeInTheDocument();
  });

  test('renders weekends unavailable note', () => {
    setup();
    expect(
      screen.getByText(/Weekends are unavailable\. Select a weekday\./i)
    ).toBeInTheDocument();
  });
});

// ===========================================================================
// Month navigation
// ===========================================================================
describe('Month navigation', () => {
  test('clicking next month shows October 2024', () => {
    setup();
    const [, nextBtn] = screen.getAllByRole('button');
    fireEvent.click(nextBtn);
    expect(screen.getByText('October 2024')).toBeInTheDocument();
  });

  test('clicking previous month shows August 2024', () => {
    setup();
    const [prevBtn] = screen.getAllByRole('button');
    fireEvent.click(prevBtn);
    expect(screen.getByText('August 2024')).toBeInTheDocument();
  });

  test('navigating to December then next wraps to January next year', () => {
    setup();
    const [, nextBtn] = screen.getAllByRole('button');
    // Sep → Oct → Nov → Dec → Jan 2025
    for (let i = 0; i < 4; i++) fireEvent.click(nextBtn);
    expect(screen.getByText('January 2025')).toBeInTheDocument();
  });

  test('navigating to January then prev wraps to December previous year', () => {
    setup();
    const [prevBtn] = screen.getAllByRole('button');
    // Sep → Aug → Jul → Jun → May → Apr → Mar → Feb → Jan → Dec 2023
    for (let i = 0; i < 9; i++) fireEvent.click(prevBtn);
    expect(screen.getByText('December 2023')).toBeInTheDocument();
  });
});

// ===========================================================================
// Day buttons — disabled states
// ===========================================================================
describe('Day buttons — disabled states', () => {
  test('past days are disabled', () => {
    // Today is 11 Sep 2024 — day 10 should be disabled
    setup();
    const day10 = screen.getByRole('button', { name: '10' });
    expect(day10).toBeDisabled();
  });

  test('weekend days are disabled — Sunday', () => {
    // 15 Sep 2024 is a Sunday
    setup();
    const day15 = screen.getByRole('button', { name: '15' });
    expect(day15).toBeDisabled();
  });

  test('weekend days are disabled — Saturday', () => {
    // 14 Sep 2024 is a Saturday
    setup();
    const day14 = screen.getByRole('button', { name: '14' });
    expect(day14).toBeDisabled();
  });

  test('future weekdays are enabled', () => {
    // 12 Sep 2024 is a Thursday (future weekday)
    setup();
    const day12 = screen.getByRole('button', { name: '12' });
    expect(day12).not.toBeDisabled();
  });
});

// ===========================================================================
// Date selection
// ===========================================================================
describe('Date selection', () => {
  test('clicking an enabled day calls onSelect with correct date string', () => {
    const onSelect = jest.fn();
    setup({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: '12' }));
    expect(onSelect).toHaveBeenCalledWith('2024-09-12');
  });

  test('clicking a disabled day does not call onSelect', () => {
    const onSelect = jest.fn();
    setup({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: '14' })); // Saturday
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('selected date button has active styling class', () => {
    setup({ selectedDate: '2024-09-12' });
    const day12 = screen.getByRole('button', { name: '12' });
    expect(day12.className).toContain('bg-dark');
  });

  test('non-selected day does not have active styling', () => {
    setup({ selectedDate: '2024-09-12' });
    const day13 = screen.getByRole('button', { name: '13' });
    expect(day13.className).not.toContain('bg-dark');
  });

  test('date string format is YYYY-MM-DD with zero-padded month and day', () => {
    const onSelect = jest.fn();
    render(<Calendar selectedDate={null} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons[1]; // second button is always the next-month chevron
    // Navigate forward 4 months: Sep 2024 → Jan 2025 (future, single-digit month)
    for (let i = 0; i < 4; i++) fireEvent.click(nextBtn);
    expect(screen.getByText('January 2025')).toBeInTheDocument();
    // Day 3 in Jan 2025 is a Friday — enabled future weekday
    // Should produce zero-padded "2025-01-03"
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onSelect).toHaveBeenCalledWith('2025-01-03');
  });
});