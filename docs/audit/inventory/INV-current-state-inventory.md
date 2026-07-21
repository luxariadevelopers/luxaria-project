# Phase 4 – Inventory Current State Inventory

**Date:** 2026-07-21  
**Baseline:** post–Phase 3 procurement (`PROC-completion-report.md`)

## Existing modules (keep / extend)

| Capability | Module | Status |
|------------|--------|--------|
| Material master | `material-master` | Partial — UOM, alt UOM, min/max/reorder; missing HSN, batch/serial flags, ABC, asset/consumable, shelf life, groups |
| Material categories | `procurement-masters` | Company catalog exists |
| Stock ledger | `stock-ledger` + `material_stock_transactions` | Immutable + reversals; missing before/after qty, value, cost layer, WH hierarchy refs |
| Stock balances | `material_stock_balances` | material + project + location string |
| GRN → stock | `goods-receipts` | Posts `purchase_receipt` |
| Material issue / return | `material-issues` | Confirm posts issue; returns post `return_from_work`; BOQ/work-location centric |
| Stock counts | `stock-counts` | Physical count + variance + director approve + adjustment ledger |
| Stock reorder | `stock-reorder` | Alerts + MRP→PR |
| Warehouses | `sites` (`SiteType.Warehouse`) | Flat warehouse sites; kinds: main/site/temp/scrap; **no zone/rack/bin** |
| Consumption / variance | `material-consumption*` | Exists for BOQ variance |
| Web inventory nav | `/inventory/*` | Materials, balances, ledger, counts, GRN, issues, reorder |
| Mobile | GRN, issue, return, stock count | Offline enqueue present; no first-class barcode module |

## Gaps vs Phase 4 scope

1. Warehouse hierarchy Zone → Rack → Bin  
2. Warehouse kinds: return store, quarantine store  
3. Costing methods (WA / FIFO / moving average) + cost layers  
4. Ledger before/after qty + value  
5. First-class stock transfers (WH/site/project)  
6. Stock reservations (DPR, contractor, labour, PO, MR)  
7. Issue target enum (site/contractor/labour/equipment/dept/employee)  
8. Return type enum (good/damaged/excess/unused)  
9. Batch/serial masters (expiry, mfg, warranty)  
10. Barcode / QR generate + scan APIs  
11. Inventory dashboard KPIs  
12. Inventory reports suite  
13. Project setting: `inventoryCostingMethod`

## Security baseline

Reuse IAM permissions (`material.*`, `stock.*`, `site.*`) + R-003 `@ProjectScoped` + company isolation. No parallel permission system.
