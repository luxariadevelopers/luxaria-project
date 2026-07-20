import {
  PurchaseRequestStatus,
  type PublicPurchaseRequest,
} from './types';

/** Statuses where a past required-by date means the PR is still open work. */
const OPEN_WORK_STATUSES = new Set<string>([
  PurchaseRequestStatus.Submitted,
  PurchaseRequestStatus.Reviewed,
  PurchaseRequestStatus.Approved,
  PurchaseRequestStatus.Sourcing,
]);

/**
 * Client overdue flag: open work + `requiredByDate` before as-of (UTC day).
 * Nest list has no dedicated overdue query.
 */
export function isPurchaseRequestOverdue(
  row: Pick<PublicPurchaseRequest, 'status' | 'requiredByDate'>,
  asOf: Date = new Date(),
): boolean {
  if (!OPEN_WORK_STATUSES.has(row.status)) return false;
  if (!row.requiredByDate) return false;
  const due = Date.parse(row.requiredByDate);
  if (Number.isNaN(due)) return false;
  const asOfDay = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  );
  const dueDay = Date.UTC(
    new Date(due).getUTCFullYear(),
    new Date(due).getUTCMonth(),
    new Date(due).getUTCDate(),
  );
  return dueDay < asOfDay;
}
