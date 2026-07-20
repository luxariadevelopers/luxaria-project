import type { PublicSiteExpenseVoucher } from './types';

/** Client-only date range (Nest list has project / account / category / status). */
export type ExpenseClientFilters = {
  /** Inclusive `YYYY-MM-DD`, or empty. */
  dateFrom: string;
  /** Inclusive `YYYY-MM-DD`, or empty. */
  dateTo: string;
};

export function hasExpenseClientFilters(filters: ExpenseClientFilters): boolean {
  return Boolean(filters.dateFrom.trim() || filters.dateTo.trim());
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

/**
 * Filter listed vouchers by expenseDate after fetch.
 */
export function applyExpenseClientFilters(
  rows: readonly PublicSiteExpenseVoucher[],
  filters: ExpenseClientFilters,
): PublicSiteExpenseVoucher[] {
  const from = filters.dateFrom.trim();
  const to = filters.dateTo.trim();
  if (!from && !to) return [...rows];
  return rows.filter((row) => {
    const key = toDateKey(row.expenseDate);
    if (from && key < toDateKey(from)) return false;
    if (to && key > toDateKey(to)) return false;
    return true;
  });
}
