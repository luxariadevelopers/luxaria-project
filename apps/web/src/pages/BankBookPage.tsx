import { CashBankBookView } from '@/reports/accounting';

/** `/reports/accounting/bank-book` — Micro Phase 109. */
export function BankBookPage() {
  return (
    <CashBankBookView
      kind="bank-book"
      title="Bank book"
      description="Inspect bank account movements with opening balance, running balance, and closing reconciliation. Nest: GET /accounting-reports/bank-book (report.view)."
    />
  );
}
