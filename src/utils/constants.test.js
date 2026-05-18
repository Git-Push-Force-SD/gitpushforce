import {
  ADMIN_USERS,
  WITS_EMAIL_PATTERN,
  validateWitsEmail,
  isAdminUser,
  resolveUserRole,
} from './constants';

describe('constants', () => {
  describe('ADMIN_USERS', () => {
    it('is a non-empty array of Wits student emails', () => {
      expect(Array.isArray(ADMIN_USERS)).toBe(true);
      expect(ADMIN_USERS.length).toBeGreaterThan(0);
      ADMIN_USERS.forEach((email) => {
        expect(email).toMatch(WITS_EMAIL_PATTERN);
      });
    });
  });

  describe('validateWitsEmail', () => {
    it('accepts valid Wits student emails', () => {
      expect(validateWitsEmail('2624301@students.wits.ac.za')).toBe(true);
      expect(validateWitsEmail('1234567@students.wits.ac.za')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(validateWitsEmail('')).toBe(false);
      expect(validateWitsEmail('not-an-email')).toBe(false);
      expect(validateWitsEmail('user@gmail.com')).toBe(false);
      expect(validateWitsEmail('abc@students.wits.ac.za')).toBe(false);
      expect(validateWitsEmail('2624301@wits.ac.za')).toBe(false);
    });
  });

  describe('isAdminUser', () => {
    it('returns false for missing or non-string email', () => {
      expect(isAdminUser(null)).toBe(false);
      expect(isAdminUser(undefined)).toBe(false);
      expect(isAdminUser('')).toBe(false);
      expect(isAdminUser(123)).toBe(false);
      expect(isAdminUser({})).toBe(false);
    });

    it('returns true for allowlisted emails (case and whitespace insensitive)', () => {
      const adminEmail = ADMIN_USERS[0];
      expect(isAdminUser(adminEmail)).toBe(true);
      expect(isAdminUser(`  ${adminEmail.toUpperCase()}  `)).toBe(true);
    });

    it('returns false for non-admin emails', () => {
      expect(isAdminUser('9999999@students.wits.ac.za')).toBe(false);
      expect(isAdminUser('user@example.com')).toBe(false);
    });
  });

  describe('resolveUserRole', () => {
    it('returns admin when db role is admin (any casing/whitespace)', () => {
      expect(resolveUserRole('admin', 'user@example.com')).toBe('admin');
      expect(resolveUserRole('  ADMIN  ', 'user@example.com')).toBe('admin');
    });

    it('returns admin when email is on the allowlist even if db role is not admin', () => {
      expect(resolveUserRole('user', ADMIN_USERS[0])).toBe('admin');
      expect(resolveUserRole(null, ADMIN_USERS[0])).toBe('admin');
    });

    it('returns user for non-admin role and non-allowlisted email', () => {
      expect(resolveUserRole('user', '9999999@students.wits.ac.za')).toBe('user');
      expect(resolveUserRole('moderator', 'user@example.com')).toBe('user');
    });

    it('treats null/undefined db role as empty string', () => {
      expect(resolveUserRole(null, '9999999@students.wits.ac.za')).toBe('user');
      expect(resolveUserRole(undefined, '9999999@students.wits.ac.za')).toBe('user');
    });
  });
});
