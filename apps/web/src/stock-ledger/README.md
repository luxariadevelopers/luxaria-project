# Stock Ledger (Micro Phase 071)

Route: `/inventory/stock-ledger`

Nav: **Inventory → Stock Ledger** (`stock.view`, project required).

## APIs (Nest — no invented endpoints)

| Endpoint | Permission | Use |
|----------|------------|-----|
| `GET /stock-ledger` | `stock.view` | Immutable movement history |
| `GET /stock-ledger/:id` | `stock.view` | Single entry (available; list is primary UI) |

**Not used in this phase UI:** `POST /stock-ledger`, `POST /:id/reverse` (`stock.adjust`) — ledger is view-only; corrections are reversals elsewhere.

**Not used:** `GET /stock-ledger/balance` (on-hand — Phase 070 Stock Balances).

Prompt alias `stock_ledger.view` is **not** in the Nest catalog — route uses `stock.view`.

## UI

| Piece | Role |
|-------|------|
| `LedgerTable` | Txn, date, type, qty in/out, **running bal (base)**, reference link |
| `LedgerFilters` | Material, type, location, batch, **valid date range** (client) |
| Transaction links | `goods_receipt` → GRN detail; `stock_count` → Stock Count detail |

## Rules

1. **No edit actions** — immutable history only.
2. Date range validated client-side (`from ≤ to`); Nest list DTO has no date query params.
3. Running balance is computed from Nest `baseUnitQuantity` (signed) within the filtered set.
4. Route guard + Nest **403** — hiding nav is not enough.
