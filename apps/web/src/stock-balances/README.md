# Stock Balances (Micro Phase 070)

Route: `/inventory/stock-balances`

Nav: **Inventory → Stock Balances** (`stock.view`, project required).

## APIs (Nest — no invented endpoints)

| Endpoint | Permission | Use |
|----------|------------|-----|
| `GET /stock-reorder/forecast?projectId=` | `stock.view` | Project material availability (search / list) |
| `GET /stock-ledger/balance?projectId=&materialId=&location=` | `stock.view` | Location-scoped on-hand when Location filter is set |

**Not used:** `GET /stock-ledger` (raw ledger lines), construction-reports `stock-balance` (`report.view`).

## UI

| Piece | Role |
|-------|------|
| `StockTable` | Code, material, location, on-hand **(base)**, base unit, reorder/min, pending PO, low-stock chip |
| `StockFilters` | Location (optional), low-stock only; project from header |
| `LowStockIndicator` | Below reorder / minimum (forecast alerts + level compare) |

## Rules

1. Quantities are always **base unit** — labels append `(base)`; alternate/display units are never implied.
2. Project isolation — query keys include `projectId`; rows are filtered with `isolateStockRowsToProject`.
3. Route guard + Nest **403** — hiding nav is not enough.
