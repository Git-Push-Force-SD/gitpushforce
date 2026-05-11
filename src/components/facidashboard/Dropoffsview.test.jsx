import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DropOffsView from './Dropoffsview';
import * as supabaseModule from '../../utils/supabase';

jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('./facilUtils', () => ({
  badgeClasses: (status) => '',
  formatDate: (date) => date,
  formatTime: (time) => time,
}));

jest.mock('./imageUtils', () => ({
  getImageUrl: (listing) =>
    listing?.image_path
      ? `https://mock.supabase.co/storage/v1/object/public/Listings/${listing.image_path}`
      : null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeBookingsMock = (resolvedValue, updateFn = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(resolvedValue),
  update: updateFn ?? jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
});

const makeOrdersMock = (updateFn = null) => ({
  update: updateFn ?? jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
  eq: jest.fn().mockReturnThis(),
});

const makeUsersMock = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockResolvedValue(resolvedValue),
});

// Base mock booking with all required fields
const makeSaleBooking = (overrides = {}) => ({
  id: 'booking-1',
  trade_id: null,
  listing_id: 'list-1',
  order_id: 'order-1',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  booked_by: null,
  date: '2026-04-30',
  time_slot: '09:00-10:00',
  booking_type: 'sale',
  listings: { id: 'list-1', title: 'Laptop', image_path: null },
  trades: null,
  ...overrides,
});

const mockSellers = [
  { id: 'seller-1', username: 'seller_user', email: 'seller@test.com' },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DropOffsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    supabaseModule.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue(new Promise(() => {})),
    });

    render(<DropOffsView />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should render table with no drop-offs message', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return makeBookingsMock({ data: [], error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<DropOffsView />);

    await waitFor(() => {
      expect(screen.getAllByText('No items pending drop-off').length).toBeGreaterThan(0);
    });
  });

  it('should render correct table headers', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return makeBookingsMock({ data: [], error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<DropOffsView />);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Drop-off Party')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  it('should render drop-off items correctly', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return makeBookingsMock({ data: [makeSaleBooking()], error: null });
      if (table === 'users') return makeUsersMock({ data: mockSellers, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<DropOffsView />);

    await waitFor(() => {
      expect(screen.getAllByText('Laptop').length).toBeGreaterThan(0);
      expect(screen.getAllByText('seller_user').length).toBeGreaterThan(0);
      expect(screen.getByText('09:00-10:00')).toBeInTheDocument();
    });
  });

  it('should render Confirm Receipt button', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return makeBookingsMock({ data: [makeSaleBooking()], error: null });
      if (table === 'users') return makeUsersMock({ data: mockSellers, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<DropOffsView />);

    await waitFor(() => {
      expect(screen.getAllByText('Confirm Receipt').length).toBeGreaterThan(0);
    });
  });

  it('should call update on bookings and orders when Confirm Receipt is clicked', async () => {
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return makeBookingsMock({ data: [makeSaleBooking()], error: null }, mockUpdate);
      if (table === 'orders') return makeOrdersMock(mockUpdate);
      if (table === 'users') return makeUsersMock({ data: mockSellers, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<DropOffsView />);

    await waitFor(() => screen.getAllByText('Confirm Receipt')[0]);
    fireEvent.click(screen.getAllByText('Confirm Receipt')[0]);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateEq).toHaveBeenCalled();
    });
  });

  it('should remove booking from list after successful confirmation', async () => {
    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return makeBookingsMock({ data: [makeSaleBooking()], error: null });
      if (table === 'orders') return makeOrdersMock();
      if (table === 'users') return makeUsersMock({ data: mockSellers, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<DropOffsView />);

    await waitFor(() => screen.getAllByText('Laptop').length > 0);
    fireEvent.click(screen.getAllByText('Confirm Receipt')[0]);

    await waitFor(() => {
      expect(screen.getAllByText('No items pending drop-off').length).toBeGreaterThan(0);
    });
  });

  it('should handle error when confirming drop-off', async () => {
    const failingUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: new Error('Update failed') }),
    });

    supabaseModule.supabase.from.mockImplementation((table) => {
      if (table === 'bookings') return makeBookingsMock({ data: [makeSaleBooking()], error: null }, failingUpdate);
      if (table === 'users') return makeUsersMock({ data: mockSellers, error: null });
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

    render(<DropOffsView />);

    await waitFor(() => screen.getAllByText('Laptop').length > 0);
    fireEvent.click(screen.getAllByText('Confirm Receipt')[0]);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Failed to confirm drop-off. Please try again.');
    });

    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
