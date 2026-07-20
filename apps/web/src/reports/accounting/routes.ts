export const ACCOUNTING_REPORTS_HUB_PATH = '/reports/accounting' as const;
export const CASH_BOOK_PATH = '/reports/accounting/cash-book' as const;
export const BANK_BOOK_PATH = '/reports/accounting/bank-book' as const;

export function accountingReportPath(reportType: string): string {
  return `${ACCOUNTING_REPORTS_HUB_PATH}/${reportType}`;
}
