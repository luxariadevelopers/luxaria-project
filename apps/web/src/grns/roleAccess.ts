/**
 * Nest RBAC codes for Goods Receipts (exact catalog):
 * - `grn.create` — create / update / submit / list / get / cancel
 * - `grn.approve` — quality-check / accept / post
 *
 * Phase 068 prompt aliases (`grn.view` / `grn.qc` / `grn.accept` / `grn.post`)
 * are not in the Nest catalog; map to the codes above.
 */
export type GrnCapabilities = {
  canView: boolean;
  canQc: boolean;
  canAccept: boolean;
  canPost: boolean;
  canCreate: boolean;
  canCancel: boolean;
  /** Optional PO comparison — `GET /purchase-orders/:id`. */
  canViewPurchaseOrder: boolean;
  /** Optional media download — `document.download`. */
  canDownloadDocuments: boolean;
};

export function resolveGrnCapabilities(
  hasPermission: (code: string) => boolean,
): GrnCapabilities {
  const canApprove = hasPermission('grn.approve');
  return {
    canView: hasPermission('grn.create'),
    canQc: canApprove,
    canAccept: canApprove,
    canPost: canApprove,
    canCreate: hasPermission('grn.create'),
    canCancel: hasPermission('grn.create'),
    canViewPurchaseOrder: hasPermission('purchase.view'),
    canDownloadDocuments: hasPermission('document.download'),
  };
}
