/**
 * Nest catalogue permissions for cash/bank books.
 * Brief aliases `report.cash_book.view` / `report.bank_book.view` are NOT in the catalog.
 */
export const CASH_BANK_BOOK_VIEW_PERMISSION = 'report.view' as const;
export const CASH_BANK_BOOK_EXPORT_PERMISSION = 'report.export' as const;

export type CashBankBookCapabilities = {
  canView: boolean;
  canExport: boolean;
};

export function resolveCashBankBookCapabilities(
  hasPermission: (code: string) => boolean,
): CashBankBookCapabilities {
  return {
    canView: hasPermission(CASH_BANK_BOOK_VIEW_PERMISSION),
    canExport: hasPermission(CASH_BANK_BOOK_EXPORT_PERMISSION),
  };
}
