# Phase 8 – Enterprise Accounting & Finance — Architecture

**Date:** 2026-07-21  
**Principle:** One immutable double-entry journal is the system of record. Operational modules post into it; statutory and statement modules read from it.

## Spine (already exists — extend, do not rebuild)

```text
Chart of Accounts → Journal Entries → FY / Period Locks → Accounting Reports
         ↑
  Vendor invoices · Contractor bills · Customer receipts · Site expenses ·
  Petty cash · Bank recon · Stock count adjustments
```

## Phase 8 extensions

| Capability | Module | Role |
|------------|--------|------|
| Cost / profit centres | `cost-centres` | Master + validate `JournalLine.costCentreId` |
| Opening balances | `opening-balances` | FY opening JV pack |
| Contribution → GL | `contribution-receipts` | Dr Bank/Cash · Cr Investor/Director |
| Customer tax invoices / revenue | `customer-invoices` | Advance → Sales + Output GST |
| GST registers / returns | `gst` | GSTR workspace from journals + invoices |
| TDS sections / returns | `tds` | From AP withholdings |
| Budgets vs actual | `budgets` | Account/period/project budgets |
| Fixed assets | `fixed-assets` | Register + depreciation → journal |
| Company statements | `accounting-reports` | Balance Sheet + company P&L |

## Posting contract

All domain posters use `JournalService.create({ post: true, sourceModule, sourceEntityType, sourceEntityId, postingPurpose?, idempotencyKey })`.

Unique active source index prevents double-posting.

## Permissions

`cost_centre.*` · `gst.*` · `tds.*` · `budget.*` · `fixed_asset.*` · `finance_statement.*` · `customer_invoice.*` · `opening_balance.*` (+ existing `account.*` / `journal.*` / `bank.*`)

## Wave order

1. Permissions + contribution → GL + opening balances  
2. Cost centres  
3. GST + TDS  
4. Budgets + fixed assets  
5. Customer invoices / AR revenue + company BS/P&L  
6. Web UI + docs + tests  

## Downstream

Phase 9 Director BI consumes posted journals, statements, budgets, and project P&L.
