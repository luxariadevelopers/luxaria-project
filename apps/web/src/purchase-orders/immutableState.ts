import { getDomainStatusLabel } from '@/status';
import { PurchaseOrderStatus, type PublicPurchaseOrder } from './types';

/**
 * Issued (and later lifecycle) POs cannot be silently edited via PATCH.
 * Nest allows PATCH only for draft — revisions use `POST /:id/revise`.
 */
export function isPurchaseOrderSilentlyEditable(
  status: string,
): boolean {
  return (
    status === PurchaseOrderStatus.Draft ||
    status === PurchaseOrderStatus.Rejected
  );
}

export function assertPurchaseOrderNotSilentlyEditable(
  status: string,
): { ok: true } | { ok: false; message: string } {
  if (isPurchaseOrderSilentlyEditable(status)) {
    return { ok: true };
  }
  const label = getDomainStatusLabel('purchaseOrder', status, status);
  return {
    ok: false,
    message: `${label} purchase orders cannot be edited in place. Use Revise to create a new draft version (re-approval required).`,
  };
}

/** Statuses that may be revised via Nest `POST /:id/revise` (issued only). */
export function canRevisePurchaseOrderStatus(status: string): boolean {
  return status === PurchaseOrderStatus.Issued;
}

export function isPurchaseOrderTerminal(
  po: Pick<PublicPurchaseOrder, 'status'>,
): boolean {
  return (
    po.status === PurchaseOrderStatus.Closed ||
    po.status === PurchaseOrderStatus.Cancelled ||
    po.status === PurchaseOrderStatus.Superseded
  );
}
