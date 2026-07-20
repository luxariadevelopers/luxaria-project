/**
 * Stale as-of detection for project dashboard timestamps.
 * Compares UTC calendar days — earlier than today is stale.
 */

function utcDayKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/** True when `asOf` is a calendar day strictly before `now` (UTC). */
export function isAsOfDateStale(
  asOf: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!asOf) {
    return false;
  }
  const asOfKey = utcDayKey(asOf);
  const todayKey = utcDayKey(now);
  if (!asOfKey || !todayKey) {
    return false;
  }
  return asOfKey < todayKey;
}

/** True when labour as-of day differs from the dashboard filter date. */
export function isLabourAsOfMismatched(
  labourAsOf: string | null | undefined,
  filterDate: string | null | undefined,
): boolean {
  if (!labourAsOf || !filterDate) {
    return false;
  }
  const a = utcDayKey(labourAsOf);
  const b = utcDayKey(filterDate);
  if (!a || !b) {
    return false;
  }
  return a !== b;
}

export function formatAsOfLabel(asOf: string | null | undefined): string {
  if (!asOf) {
    return '—';
  }
  const key = utcDayKey(asOf);
  return key ?? '—';
}
