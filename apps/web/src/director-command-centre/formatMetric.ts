import { formatInr, formatPercentage } from '@/format';

/**
 * Display helpers that avoid inventing zeros for missing metrics.
 * Real `0` from the API is shown; `null` / `undefined` → em dash.
 */
export function formatOptionalMoney(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return formatInr(value);
}

export function formatOptionalCount(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return String(value);
}

export function formatOptionalPercent(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return formatPercentage(value);
}

export function hasMetric(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !Number.isNaN(value);
}
