/**
 * Backend project dashboard / DPR normalize calendar days to UTC midnight.
 * Prefer the server `filters.date` when present; otherwise use UTC “today”.
 * Projects have no timezone field — do not invent one.
 */

/** UTC calendar day as `YYYY-MM-DD` (matches Nest `startOfUtcDay` defaults). */
export function utcTodayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Extract `YYYY-MM-DD` from an ISO datetime or date-only string. */
export function toUtcDateKey(isoOrDate: string): string {
  const trimmed = isoOrDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Whether a GRN `receivedDate` falls on the same UTC calendar day as `dateKey`.
 */
export function isSameUtcDay(
  receivedDate: string | Date,
  dateKey: string,
): boolean {
  const key =
    typeof receivedDate === 'string'
      ? toUtcDateKey(receivedDate)
      : receivedDate.toISOString().slice(0, 10);
  return key === dateKey;
}
