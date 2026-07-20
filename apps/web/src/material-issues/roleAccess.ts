/**
 * Nest RBAC codes for Material Issues (exact catalog):
 * - `stock.view` — list / get
 * - `stock.issue` — create / update / signatures / submit / returns / cancel
 * - `stock.adjust` — confirm (posts ledger)
 *
 * Phase 073 prompt aliases (`material_issue.view` / `create` / `confirm`)
 * are not in the Nest catalog; map to the codes above.
 */
export type MaterialIssueCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canSubmit: boolean;
  canConfirm: boolean;
  canReturn: boolean;
  canCancel: boolean;
  canAttachSignatures: boolean;
  /** BOQ selector — `GET /boq/projects/:projectId/items`. */
  canViewBoq: boolean;
  /** Material picker — `GET /materials`. */
  canViewMaterials: boolean;
  /** Available-stock indicator — `GET /stock-ledger/balance`. */
  canViewStock: boolean;
  /** Receiver picker — `GET /users`. */
  canViewUsers: boolean;
  /** Signature upload / preview. */
  canUploadDocuments: boolean;
  canDownloadDocuments: boolean;
};

export function resolveMaterialIssueCapabilities(
  hasPermission: (code: string) => boolean,
): MaterialIssueCapabilities {
  const canIssue = hasPermission('stock.issue');
  return {
    canView: hasPermission('stock.view'),
    canCreate: canIssue,
    canUpdate: canIssue,
    canSubmit: canIssue,
    canConfirm: hasPermission('stock.adjust'),
    canReturn: canIssue,
    canCancel: canIssue,
    canAttachSignatures: canIssue,
    canViewBoq: hasPermission('boq.view'),
    canViewMaterials: hasPermission('material.view'),
    canViewStock: hasPermission('stock.view'),
    canViewUsers: hasPermission('user.view'),
    canUploadDocuments: hasPermission('document.upload'),
    canDownloadDocuments: hasPermission('document.download'),
  };
}
