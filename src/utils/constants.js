// Admin user emails - centralized list
export const ADMIN_USERS = [
  '2624301@students.wits.ac.za',
  '2685923@students.wits.ac.za',
  '2677770@students.wits.ac.za',
  '2549625@students.wits.ac.za',
  '2590255@students.wits.ac.za',
  '2594438@students.wits.ac.za'
];

// Wits email validation pattern
export const WITS_EMAIL_PATTERN = /^[0-9]+@students\.wits\.ac\.za$/;

export const validateWitsEmail = (email) => {
  return WITS_EMAIL_PATTERN.test(email);
};

export const isAdminUser = (email) => {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_USERS.includes(email.toLowerCase().trim());
};

/** Normalize DB role and fall back to admin allowlist (handles casing/whitespace; list wins if DB read fails). */
export function resolveUserRole(dbRole, email) {
  const r = dbRole == null ? '' : String(dbRole).toLowerCase().trim();
  if (r === 'admin') return 'admin';
  if (isAdminUser(email)) return 'admin';
  return 'user';
}
