export type StockLedgerCapabilities = {
  /** List / get ledger — Nest `stock.view` (prompt alias `stock_ledger.view` unused). */
  canView: boolean;
};

/**
 * Nest RBAC for stock ledger query APIs.
 * Phase UI is read-only (no post/reverse actions).
 */
export function resolveStockLedgerCapabilities(
  hasPermission: (code: string) => boolean,
): StockLedgerCapabilities {
  return {
    canView: hasPermission('stock.view'),
  };
}
