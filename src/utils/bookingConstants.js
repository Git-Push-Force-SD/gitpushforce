// src/utils/bookingConstants.js
// Shared constants for the student booking feature

export const FACILITY_LOCATION = 'Trade Facility — Room 2B';

export const DEFAULT_TIME_SLOTS = [
  '08:00–08:30',
  '08:30–09:00',
  '09:00–09:30',
  '09:30–10:00',
  '10:00–10:30',
  '10:30–11:00',
  '11:00–11:30',
  '14:00–14:30',
  '14:30–15:00',
  '15:00–15:30',
  '15:30–16:00',
];

export const BOOKING_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  COLLECTED: 'collected',
  CANCELLED: 'cancelled',
};

export const STATUS_META = {
  pending: {
    label: 'Pending',
    bg: '#FFF7E6',
    color: '#92570A',
  },
  confirmed: {
    label: 'Confirmed',
    bg: '#E6F1FB',
    color: '#185FA5',
  },
  collected: {
    label: 'Collected',
    bg: '#EAF3DE',
    color: '#3B6D11',
  },
  cancelled: {
    label: 'Cancelled',
    bg: '#FCEBEB',
    color: '#A32D2D',
  },
};

export const TIMELINE_STEPS = [
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'collected', label: 'Collected' },
];

// Booking hours enforced on the frontend (matches server-side validation)
export const BOOKING_HOUR_START = 7;  // 07:00
export const BOOKING_HOUR_END   = 21; // 21:00