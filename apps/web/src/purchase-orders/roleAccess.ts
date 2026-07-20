/**
 * Nest permissions for purchase orders
 * (`apps/backend/docs/PURCHASE_ORDERS_API.md`):
 * - `purchase.view` — list, get, balance, export PDF
 * - `purchase.order` — create, update, submit, revise, close, cancel
 * - `purchase.approve` — approve / reject (issues when fully approved)
 * - `grn.create` — record receipts against PO
 * - `quotation.view` — load approved quotation for create prefill
 *
 * Prompt aliases `purchase_order.view/create/approve/issue` are **not** in the
 * Nest catalog. There is no separate `purchase.issue` — issue happens on approve.
 */

export type PurchaseOrderCapabilities = {
  canView: boolean;
  /**
   * Nest `purchase.order` — create draft, update draft, submit for approval,
   * revise, close, cancel.
   */
  canOrder: boolean;
  /** Alias of `canOrder` for create clarity. */
  canCreate: boolean;
  /** Alias of `canOrder` for submit clarity (same Nest code). */
  canSubmit: boolean;
  /** Alias of `canOrder` — revise issued PO. */
  canRevise: boolean;
  /** Alias of `canOrder` — cancel PO. */
  canCancel: boolean;
  /** Alias of `canOrder` — close PO. */
  canClose: boolean;
  /** Alias of `canOrder` — no Nest `purchase.issue` code. */
  canIssueLifecycle: boolean;
  canApprove: boolean;
  canReceive: boolean;
  /** Load approved quotation for rate/qty prefill. */
  canViewQuotations: boolean;
};

export function resolvePurchaseOrderCapabilities(
  hasPermission: (code: string) => boolean,
): PurchaseOrderCapabilities {
  const canOrder = hasPermission('purchase.order');
  return {
    canView: hasPermission('purchase.view'),
    canOrder,
    canCreate: canOrder,
    canSubmit: canOrder,
    canRevise: canOrder,
    canCancel: canOrder,
    canClose: canOrder,
    canIssueLifecycle: canOrder,
    canApprove: hasPermission('purchase.approve'),
    canReceive: hasPermission('grn.create'),
    canViewQuotations: hasPermission('quotation.view'),
  };
}
