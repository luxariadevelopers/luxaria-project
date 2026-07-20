import type { PurchaseRequestCapabilities } from './roleAccess';
import {
  PurchaseRequestStatus,
  type PublicPurchaseRequest,
} from './types';

export type PurchaseRequestActionId =
  | 'review'
  | 'approve'
  | 'reject'
  | 'return'
  | 'close'
  | 'submit'
  | 'cancel';

/**
 * Status + permission gate for detail/list actions (Phase 062).
 * Nest still enforces transitions authoritatively.
 */
export function resolvePurchaseRequestActions(
  row: Pick<PublicPurchaseRequest, 'status'>,
  caps: PurchaseRequestCapabilities,
): PurchaseRequestActionId[] {
  const actions: PurchaseRequestActionId[] = [];

  if (
    caps.canRequest &&
    (row.status === PurchaseRequestStatus.Draft ||
      row.status === PurchaseRequestStatus.Returned)
  ) {
    actions.push('submit', 'cancel');
  }

  if (
    caps.canRequest &&
    row.status === PurchaseRequestStatus.Submitted
  ) {
    actions.push('cancel');
  }

  if (
    caps.canApprove &&
    row.status === PurchaseRequestStatus.Submitted
  ) {
    actions.push('review', 'reject', 'return');
  }

  if (caps.canApprove && row.status === PurchaseRequestStatus.Reviewed) {
    actions.push('approve', 'reject', 'return');
  }

  if (
    caps.canOrder &&
    (row.status === PurchaseRequestStatus.Approved ||
      row.status === PurchaseRequestStatus.Sourcing)
  ) {
    actions.push('close');
  }

  return actions;
}
