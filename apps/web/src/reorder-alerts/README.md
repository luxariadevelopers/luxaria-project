# Reorder alerts (Micro Phase 074)

Route: `/inventory/reorder-alerts`  
Nav: **Inventory → Reorder Alerts** (`projectScope: required`)

## APIs

Base: `/stock-reorder` (Swagger tag **Stock Reorder**)

| Endpoint | Permission |
|----------|------------|
| `GET /alerts` · `GET /forecast?projectId=` | `stock.view` |
| `POST /evaluate` | `stock.adjust` |

Catalog has **no** `stock_forecast.view` alias — view maps to `stock.view`.

## UI

1. Assumptions banner — data timestamp (`evaluatedAt`) + lookback / stock-out / recommended-qty rules
2. `AlertTable` — severity, stock-out date, pending PO qty, recommended purchase qty
3. Optional **Run evaluation** (`stock.adjust`) and **Create PO** deep-link (`purchase.order`)

## Severity (client)

| Nest alert type | Severity |
|-----------------|----------|
| `below_minimum_level`, `expected_stockout_within_days` | critical |
| `below_reorder_level`, `no_open_purchase_order` | high |
| `slow_moving_stock` | medium |
| `excess_stock` | low |

## Tests

- `alertSeverity.test.ts` — severity mapping & sort order
- `roleAccess.test.ts` — Nest `stock.view` / `stock.adjust`
