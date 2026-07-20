# Micro Phase 109 — Completion report

## Delivered

| Item | Status |
|------|--------|
| Module `apps/web/src/reports/accounting/` | Done (cash/bank book runner) |
| Page `/reports/accounting/cash-book` | Done |
| Page `/reports/accounting/bank-book` | Done |
| Account selector + running balance + journal links | Done |
| Opening + movements = closing validation | Done |
| Nest permissions `report.view` / `report.export` | Done |
| Nav **Accounting reports → Cash Book / Bank Book** | Done |
| Unit tests (running balance + transaction links) | Done |
| `docs/ui-api-matrix.md` | Updated |

## Nest APIs used

- `GET /accounting-reports/cash-book` — `report.view`
- `GET /accounting-reports/bank-book` — `report.view`
- `GET /accounting-reports/:reportType/export` — `report.export` (`pdf` \| `xlsx`)
- `GET /accounts` — `account.view` (account selector)
- `GET /financial-years` — `financial_year.view` (FY filter)

Query params (Nest DTO): `financialYearId`, `projectId`, `from`, `to`, `accountId`.

## Permissions

Nest catalog only: `report.view` | `report.export`.  
Not used (absent from catalog): `report.cash_book.view`, `report.bank_book.view`.

## Acceptance

Users with `report.view` can open cash and bank books, filter by account/period, follow journal links, and confirm opening + movements = closing.
