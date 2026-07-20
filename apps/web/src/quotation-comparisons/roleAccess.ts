export type QuotationComparisonCapabilities = {
  /** Nest `quotation.compare` — generate, list, get, export PDF, cancel. */
  canCompare: boolean;
  /** Nest `quotation.recommend` — recommend vendor, submit for approval. */
  canRecommend: boolean;
  /**
   * Nest has no `quotation.approve`. Final approval is via Approvals inbox
   * (`approval.act` on `procurement` / `quotation_comparison`).
   */
  canActOnApproval: boolean;
  canView: boolean;
  canGenerate: boolean;
  canExportPdf: boolean;
  canCancel: boolean;
  canSubmitApproval: boolean;
};

/**
 * Exact Nest RBAC codes for quotation comparisons.
 * Prompt alias `quotation.approve` is not in the catalog.
 */
export function resolveQuotationComparisonCapabilities(
  hasPermission: (code: string) => boolean,
): QuotationComparisonCapabilities {
  const canCompare = hasPermission('quotation.compare');
  const canRecommend = hasPermission('quotation.recommend');
  return {
    canCompare,
    canRecommend,
    canActOnApproval: hasPermission('approval.act'),
    canView: canCompare,
    canGenerate: canCompare,
    canExportPdf: canCompare,
    canCancel: canCompare,
    canSubmitApproval: canRecommend,
  };
}
