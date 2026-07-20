/**
 * Nest RBAC codes for purchase requests.
 * Catalog uses `purchase.*` (not `purchase_request.review` / `approve` / `create`).
 */
export type PurchaseRequestCapabilities = {
  canView: boolean;
  /** Create, update draft/returned, submit, cancel. */
  canRequest: boolean;
  /** Review / approve / reject / return. */
  canApprove: boolean;
  /** Start sourcing / close. */
  canOrder: boolean;
  /** Material picker + master levels. */
  canViewMaterials: boolean;
  /** Live current-stock preview via stock ledger. */
  canViewStock: boolean;
  /** Optional BOQ line selector. */
  canViewBoq: boolean;
};

export function resolvePurchaseRequestCapabilities(
  hasPermission: (code: string) => boolean,
): PurchaseRequestCapabilities {
  return {
    canView: hasPermission('purchase.view'),
    canRequest: hasPermission('purchase.request'),
    canApprove: hasPermission('purchase.approve'),
    canOrder: hasPermission('purchase.order'),
    canViewMaterials: hasPermission('material.view'),
    canViewStock: hasPermission('stock.view'),
    canViewBoq: hasPermission('boq.view'),
  };
}
