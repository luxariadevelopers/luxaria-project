import type { PublicContractorBill } from './types';

/** Client-only billing period filter (Nest list has no period query). */
export type RunningBillClientFilters = {
  /** Inclusive `YYYY-MM-DD`, or empty. */
  periodFrom: string;
  /** Inclusive `YYYY-MM-DD`, or empty. */
  periodTo: string;
};

export function hasRunningBillClientFilters(
  filters: RunningBillClientFilters,
): boolean {
  return Boolean(filters.periodFrom.trim() || filters.periodTo.trim());
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

/**
 * Keep bills whose billing period overlaps the selected filter window.
 * Overlap: bill.from ≤ filter.to AND bill.to ≥ filter.from.
 */
export function applyRunningBillClientFilters(
  rows: readonly PublicContractorBill[],
  filters: RunningBillClientFilters,
): PublicContractorBill[] {
  const from = filters.periodFrom.trim();
  const to = filters.periodTo.trim();
  if (!from && !to) return [...rows];

  return rows.filter((row) => {
    const billFrom = toDateKey(row.billingPeriod.from);
    const billTo = toDateKey(row.billingPeriod.to);
    if (from && billTo < toDateKey(from)) return false;
    if (to && billFrom > toDateKey(to)) return false;
    return true;
  });
}
