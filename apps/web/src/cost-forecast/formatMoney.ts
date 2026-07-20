const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

/** Display helper — real `0` is shown; null/undefined → em dash. */
export function formatOptionalMoney(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return inr.format(value);
}

export function hasMetric(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !Number.isNaN(value);
}
