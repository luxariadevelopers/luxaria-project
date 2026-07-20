export type QuotationCapabilities = {
  canView: boolean;
  /**
   * Create, update draft, submit, revise, upload document, cancel.
   * Nest code: `quotation.manage` (prompt aliases create/revise map here).
   */
  canManage: boolean;
  /** Mark final — Nest `quotation.finalize`. */
  canFinalize: boolean;
};

/**
 * Nest RBAC for vendor quotations (exact catalog codes).
 * Prompt aliases `quotation.create` / `quotation.revise` are not in Nest —
 * both map to `quotation.manage`.
 */
export function resolveQuotationCapabilities(
  hasPermission: (code: string) => boolean,
): QuotationCapabilities {
  return {
    canView: hasPermission('quotation.view'),
    canManage: hasPermission('quotation.manage'),
    canFinalize: hasPermission('quotation.finalize'),
  };
}
