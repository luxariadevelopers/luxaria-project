export type StockCountCapabilities = {
  /** List / get — Nest `stock.view` (prompt alias `stock_count.view` unused). */
  canView: boolean;
  /**
   * Create, update, submit, review, post, cancel; approve when variance is not large.
   * Nest `stock.adjust` (aliases `stock_count.create|post` unused).
   */
  canAdjust: boolean;
  /** Approve counts with large variances — Nest `stock.count.director_approve`. */
  canDirectorApprove: boolean;
};

/**
 * Nest RBAC — exact codes from Stock Counts controller / approve service.
 */
export function resolveStockCountCapabilities(
  hasPermission: (code: string) => boolean,
): StockCountCapabilities {
  return {
    canView: hasPermission('stock.view'),
    canAdjust: hasPermission('stock.adjust'),
    canDirectorApprove: hasPermission('stock.count.director_approve'),
  };
}

/** Whether the actor may call approve for this count’s director flag. */
export function canApproveStockCount(
  caps: StockCountCapabilities,
  requiresDirectorApproval: boolean,
): boolean {
  if (!caps.canView) return false;
  if (requiresDirectorApproval) return caps.canDirectorApprove;
  return caps.canAdjust;
}
