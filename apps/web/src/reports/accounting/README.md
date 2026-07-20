# Accounting cash / bank books (Micro Phase 109)

Web runners for Nest accounting-reports cash and bank books.

## Routes

| Page | Path | Nest API | Permission |
|------|------|----------|------------|
| Cash book | `/reports/accounting/cash-book` | `GET /accounting-reports/cash-book` | `report.view` |
| Bank book | `/reports/accounting/bank-book` | `GET /accounting-reports/bank-book` | `report.view` |
| Export | dialog | `GET /accounting-reports/:type/export` | `report.export` |

Brief aliases `report.cash_book.view` / `report.bank_book.view` are **not** in the Nest permission catalog.

## UI pieces

- `AccountSelector` — filters cash/petty_cash or bank GL accounts (`account.view`)
- `BookTable` — movements with running balance + journal links
- `BookSummary` — opening / debit / credit / closing + reconciliation check

## Validation

Client checks `opening + debit − credit = closing` and that each row’s `runningBalance` matches the cumulative trail (`reconcile.ts`).
