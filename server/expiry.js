// Expiry rules from the FRESHLOOP spec (section 7):
//  - 3 days before the expiry date  -> alert, ask the user to check the remaining quantity
//  - on the expiry date (and after) -> second alert, status "needs check"
//  - products are never removed automatically.

export const ALERT_DAYS_BEFORE = 3;

/** Today's date as YYYY-MM-DD in the server's local time zone. */
export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `today` until `expiry` (both YYYY-MM-DD). Negative = past. */
export function daysUntil(expiry, today = todayISO()) {
  const a = Date.UTC(...today.split('-').map((n, i) => (i === 1 ? n - 1 : +n)));
  const b = Date.UTC(...expiry.split('-').map((n, i) => (i === 1 ? n - 1 : +n)));
  return Math.round((b - a) / 86_400_000);
}

/**
 * Status of an inventory item:
 *  - no_date      : the user has not entered an expiry date yet
 *  - fresh        : more than 3 days left
 *  - expiring     : 1–3 days left (user is asked to check the quantity)
 *  - needs_check  : expiry day reached or passed
 */
export function itemStatus(item, today = todayISO()) {
  if (!item.expiry_date) return { status: 'no_date', days_left: null };
  const days = daysUntil(item.expiry_date, today);
  if (days <= 0) return { status: 'needs_check', days_left: days };
  if (days <= ALERT_DAYS_BEFORE) return { status: 'expiring', days_left: days };
  return { status: 'fresh', days_left: days };
}

/** Which alert kinds are due for an item today (before checking what was already sent). */
export function dueAlertKinds(item, today = todayISO()) {
  if (!item.expiry_date || item.removed_at) return [];
  const days = daysUntil(item.expiry_date, today);
  const kinds = [];
  // Only send the 3-day alert while it is still before the expiry day.
  if (days <= ALERT_DAYS_BEFORE && days > 0) kinds.push('three_days');
  if (days <= 0) kinds.push('expiry_day');
  return kinds;
}
