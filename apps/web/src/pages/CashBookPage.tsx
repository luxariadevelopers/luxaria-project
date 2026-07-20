import { CashBankBookView } from '@/reports/accounting';

/** `/reports/accounting/cash-book` — Micro Phase 109. */
export function CashBookPage() {
  return (
    <CashBankBookView
      kind="cash-book"
      title="Cash book"
      description="Inspect cash and petty-cash movements with opening balance, running balance, and closing reconciliation. Nest: GET /accounting-reports/cash-book (report.view)."
    />
  );
}
