/**
 * Nest RBAC for Stock Reorder (exact catalog):
 * - `stock.view` — forecast + list alerts
 * - `stock.adjust` — trigger evaluation job
 *
 * Phase 074 prompt alias `stock_forecast.view` is not in the Nest catalog;
 * map view to `stock.view`.
 */
export type ReorderAlertCapabilities = {
  canView: boolean;
  canEvaluate: boolean;
  /** Deep-link / create PO from recommended qty — `purchase.order`. */
  canCreatePurchaseOrder: boolean;
};

export function resolveReorderAlertCapabilities(
  hasPermission: (code: string) => boolean,
): ReorderAlertCapabilities {
  return {
    canView: hasPermission('stock.view'),
    canEvaluate: hasPermission('stock.adjust'),
    canCreatePurchaseOrder: hasPermission('purchase.order'),
  };
}
