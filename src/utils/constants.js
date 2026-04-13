// Wits email validation pattern
export const WITS_EMAIL_PATTERN = /^[0-9]+@students\.wits\.ac\.za$/;

export const validateWitsEmail = (email) => {
  return WITS_EMAIL_PATTERN.test(email);
};

export function resolveUserRole(dbRole, email) {
  const r = dbRole == null ? '' : String(dbRole).toLowerCase().trim();
  if (r === 'admin') return 'admin';
  if (r === 'staff') return 'staff';
  return 'student';
}
