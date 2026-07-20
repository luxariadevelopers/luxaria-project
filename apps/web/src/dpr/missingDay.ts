import type { DprDayCompliance } from './types';

const DPR_COMPLETE = new Set(['submitted', 'reviewed']);
const DPR_PENDING = new Set(['draft', 'reopened']);

/**
 * Derives per-day compliance for list missing-day indicators.
 *
 * Missing-DPR alerts are raised by evening evaluation (`DPR_MISSING_CRON`,
 * default 20:00). Until an alert exists, a silent day is “awaiting cut-off”
 * rather than confirmed missing.
 */
export function deriveDayCompliance(input: {
  dpr?: { status: string } | null;
  missingAlert?: { id: string } | null;
}): DprDayCompliance {
  if (input.missingAlert) {
    return 'missing';
  }
  if (input.dpr) {
    if (DPR_COMPLETE.has(input.dpr.status)) {
      return 'complete';
    }
    if (DPR_PENDING.has(input.dpr.status)) {
      return 'pending';
    }
  }
  return 'awaiting_cutoff';
}

export function reportDateKey(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function indexDprsByDate<T extends { reportDate: string | Date }>(
  rows: readonly T[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(reportDateKey(row.reportDate), row);
  }
  return map;
}

export function indexMissingAlertsByDate<
  T extends { reportDate: string | Date },
>(alerts: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const alert of alerts) {
    map.set(reportDateKey(alert.reportDate), alert);
  }
  return map;
}
