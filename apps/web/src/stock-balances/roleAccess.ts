export type StockBalanceCapabilities = {
  canView: boolean;
};

/**
 * Nest RBAC — `stock.view` (Stock Ledger balance + Stock Reorder forecast).
 */
export function resolveStockBalanceCapabilities(
  hasPermission: (code: string) => boolean,
): StockBalanceCapabilities {
  return {
    canView: hasPermission('stock.view'),
  };
}
