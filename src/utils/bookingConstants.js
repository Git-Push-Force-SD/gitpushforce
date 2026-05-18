// src/utils/bookingConstants.js
// Shared constants for the student booking feature

export const FACILITY_LOCATION = 'Trade Facility — Room 2B';

export const DEFAULT_TIME_SLOTS = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
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
export const BOOKING_HOUR_START = 9;  // 09:00
export const BOOKING_HOUR_END   = 17; // 17:00