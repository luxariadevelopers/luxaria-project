import { isPurchaseRequestOverdue } from './overdue';
import type { PublicPurchaseRequest } from './types';

/** Client-only overdue filter (Nest list has status / priority / project). */
export type PurchaseRequestClientFilters = {
  overdueOnly: boolean;
};

export function hasPurchaseRequestClientFilters(
  filters: PurchaseRequestClientFilters,
): boolean {
  return filters.overdueOnly;
}

export function applyPurchaseRequestClientFilters(
  rows: readonly PublicPurchaseRequest[],
  filters: PurchaseRequestClientFilters,
  asOf: Date = new Date(),
): PublicPurchaseRequest[] {
  if (!filters.overdueOnly) return [...rows];
  return rows.filter((row) => isPurchaseRequestOverdue(row, asOf));
}
