import { badgeClasses, formatDate, formatTime } from './facilUtils';

describe('facilUtils', () => {
  describe('badgeClasses', () => {
    it('should return correct classes for pending status', () => {
      const result = badgeClasses('pending');
      expect(result).toBe('bg-amber-100 text-amber-700 border border-amber-200');
    });

    it('should return correct classes for confirmed status', () => {
      const result = badgeClasses('confirmed');
      expect(result).toBe('bg-amber-100 text-amber-700 border border-amber-200');
    });

    it('should return correct classes for ready_for_dropoff status', () => {
      const result = badgeClasses('ready_for_dropoff');
      expect(result).toBe('bg-blue-100 text-blue-700 border border-blue-200');
    });

    it('should return correct classes for dropped_off status', () => {
      const result = badgeClasses('dropped_off');
      expect(result).toBe('bg-primary/10 text-primary border border-primary/20');
    });

    it('should return correct classes for ready_for_collection status', () => {
      const result = badgeClasses('ready_for_collection');
      expect(result).toBe('bg-purple-100 text-purple-700 border border-purple-200');
    });

    it('should return correct classes for collected status', () => {
      const result = badgeClasses('collected');
      expect(result).toBe('bg-primary/10 text-primary border border-primary/20');
    });

    it('should return correct classes for cancelled status', () => {
      const result = badgeClasses('cancelled');
      expect(result).toBe('bg-red-100 text-red-700 border border-red-200');
    });

    it('should return correct classes for Payment clear status', () => {
      const result = badgeClasses('Payment clear');
      expect(result).toBe('bg-primary/10 text-primary border border-primary/20');
    });

    it('should return correct classes for Cash outstanding status', () => {
      const result = badgeClasses('Cash outstanding');
      expect(result).toBe('bg-red-100 text-red-700 border border-red-200');
    });

    it('should return default classes for unknown status', () => {
      const result = badgeClasses('unknown_status');
      expect(result).toBe('bg-light text-dark border border-light');
    });
  });

  describe('formatDate', () => {
    it('should return N/A for null or undefined', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should return N/A for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
    });

    it('should format valid date string correctly', () => {
      const result = formatDate('2026-04-30');

      // en-ZA format is "30 Apr"
      expect(result).toMatch(/^\d{1,2}\s[A-Za-z]{3}$/);
      expect(result).toContain('Apr');
    });

    it('should handle ISO date strings', () => {
      const result = formatDate('2026-01-15T10:30:00Z');

      expect(result).toMatch(/^\d{1,2}\s[A-Za-z]{3}$/);
      expect(result).toContain('Jan');
    });

    it('should use en-ZA locale (South African)', () => {
      const result = formatDate('2026-12-25');

      // en-ZA returns day first, then abbreviated month
      expect(result).toMatch(/^\d{1,2}\s[A-Za-z]{3}$/);
      expect(result).toContain('Dec');
    });
  });

  describe('formatTime', () => {
    it('should return N/A for null or undefined', () => {
      expect(formatTime(null)).toBe('N/A');
      expect(formatTime(undefined)).toBe('N/A');
    });

    it('should return N/A for empty string', () => {
      expect(formatTime('')).toBe('N/A');
    });

    it('should return time range as-is if it contains dash', () => {
      const result = formatTime('09:00-10:00');
      expect(result).toBe('09:00-10:00');
    });

    it('should return single time slot as-is', () => {
      const result = formatTime('14:30');
      expect(result).toBe('14:30');
    });

    it('should handle various time formats', () => {
      expect(formatTime('08:00-09:00')).toBe('08:00-09:00');
      expect(formatTime('12:00')).toBe('12:00');
      expect(formatTime('16:45')).toBe('16:45');
    });
  });
});