import { getInitials } from './avatarUtils';

describe('getInitials', () => {
  it('returns first letter uppercased for a single word', () => {
    expect(getInitials('alice')).toBe('A');
  });

  it('returns two initials for a two-word name', () => {
    expect(getInitials('Alice Bob')).toBe('AB');
  });

  it('truncates to 2 chars for a three-word name', () => {
    expect(getInitials('Alice Bob Carol')).toBe('AB');
  });

  it('returns ? for null', () => {
    expect(getInitials(null)).toBe('?');
  });

  it('returns ? for undefined', () => {
    expect(getInitials(undefined)).toBe('?');
  });

  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?');
  });
});
