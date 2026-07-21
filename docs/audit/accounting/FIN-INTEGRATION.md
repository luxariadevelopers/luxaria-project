# Phase 8 Accounting — Integration Notes

## Upstream posters (existing + new)

| Source | Module | Entry |
|--------|--------|-------|
| Vendor invoice / payment | procurement | AP + GST + TDS |
| Contractor bill / payment | contractor | AP recognition + settlement |
| Customer receipt | sales | Dr Bank · Cr Customer Advance |
| Customer invoice | `customer-invoices` | Dr Advance · Cr Sales + Output GST |
| Contribution receipt | capital | Dr Bank · Cr Investor/Director |
| Opening balance pack | `opening-balances` | Opening TB |
| Fixed asset depreciation | `fixed-assets` | Dr DepExp · Cr AccumDep |
| Site expense / petty / bank recon / stock count | existing | as before |

## Statutory consumers

- `gst` — registers + GSTR workspace from `gst_documents`
- `tds` — deductions + Form 26Q/24Q/27Q from withholdings

## Dimensions

- `JournalLine.costCentreId` validated against `cost-centres` master (`assertActive`)
- Project / party / fundingSource remain required where COA flags demand them

## Statements

`GET /accounting-reports/balance-sheet`  
`GET /accounting-reports/company-profit-and-loss`  
(+ existing TB, ledgers, ageing, project P&L, cash flow)
