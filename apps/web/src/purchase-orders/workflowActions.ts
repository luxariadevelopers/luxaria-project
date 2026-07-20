import type { PurchaseOrderCapabilities } from './roleAccess';
import { PurchaseOrderStatus, type PublicPurchaseOrder } from './types';

export type PurchaseOrderActionId =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'revise'
  | 'cancel'
  | 'close'
  | 'export_pdf';

/**
 * Status + permission gate for detail actions.
 * Nest still enforces transitions authoritatively.
 *
 * Note: there is no separate Nest `issue` endpoint — approve issues when
 * the approval request reaches fully approved.
 */
export function resolvePurchaseOrderDetailActions(
  row: Pick<
    PublicPurchaseOrder,
    'status' | 'balanceQuantity' | 'items'
  >,
  caps: PurchaseOrderCapabilities,
): PurchaseOrderActionId[] {
  const actions: PurchaseOrderActionId[] = [];

  if (
    caps.canSubmit &&
    (row.status === PurchaseOrderStatus.Draft ||
      row.status === PurchaseOrderStatus.Rejected)
  ) {
    actions.push('submit');
  }

  if (
    caps.canApprove &&
    row.status === PurchaseOrderStatus.PendingApproval
  ) {
    actions.push('approve', 'reject');
  }

  if (
    caps.canRevise &&
    row.status === PurchaseOrderStatus.Issued
  ) {
    actions.push('revise');
  }

  if (
    caps.canCancel &&
    row.status !== PurchaseOrderStatus.Closed &&
    row.status !== PurchaseOrderStatus.Cancelled &&
    row.status !== PurchaseOrderStatus.Superseded &&
    row.status !== PurchaseOrderStatus.FullyReceived &&
    !(
      row.status === PurchaseOrderStatus.PartiallyReceived &&
      row.items.some((i) => i.receivedQuantity > 0)
    )
  ) {
    actions.push('cancel');
  }

  if (
    caps.canClose &&
    (row.status === PurchaseOrderStatus.Issued ||
      row.status === PurchaseOrderStatus.PartiallyReceived ||
      row.status === PurchaseOrderStatus.FullyReceived)
  ) {
    actions.push('close');
  }

  if (
    caps.canView &&
    row.status !== PurchaseOrderStatus.Cancelled &&
    row.status !== PurchaseOrderStatus.Superseded
  ) {
    actions.push('export_pdf');
  }

  return actions;
}
