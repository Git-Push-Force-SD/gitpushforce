// ─────────────────────────────────────────────────────────────────────────────
// SHARED UTILITIES — FacilDashboard
// ─────────────────────────────────────────────────────────────────────────────

export function badgeClasses(status) {
  if (status === 'pending' || status === 'confirmed') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (status === 'ready_for_dropoff') return 'bg-blue-100 text-blue-700 border border-blue-200';
  if (status === 'dropped_off') return 'bg-primary/10 text-primary border border-primary/20';
  if (status === 'ready_for_collection') return 'bg-purple-100 text-purple-700 border border-purple-200';
  if (status === 'collected') return 'bg-primary/10 text-primary border border-primary/20';
  if (status === 'cancelled') return 'bg-red-100 text-red-700 border border-red-200';
  if (status === 'Payment clear') return 'bg-primary/10 text-primary border border-primary/20';
  if (status === 'Cash outstanding') return 'bg-red-100 text-red-700 border border-red-200';
  return 'bg-light text-dark border border-light';
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
}

export function formatTime(timeSlot) {
  if (!timeSlot) return 'N/A';
  if (typeof timeSlot === 'string' && timeSlot.includes('-')) return timeSlot;
  return timeSlot;
}