# Stock Counts (Micro Phase 072)

Route: `/inventory/stock-counts` (+ `/:countId` detail)

Nav: **Inventory → Stock Counts** (`stock.view`, project required).

## APIs (Nest — no invented endpoints)

| Endpoint | Permission |
|----------|------------|
| `GET /stock-counts` · `GET /:id` | `stock.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `…/review` · `…/post` · `…/cancel` | `stock.adjust` |
| `POST …/approve` | Route gate `stock.view`; service requires `stock.adjust` or `stock.count.director_approve` when large |

Supporting (create drawer system qty): `GET /stock-ledger/balance` (`stock.view`), `GET /materials` (`material.view`).

Prompt aliases `stock_count.view|create|approve|post` are **not** catalogued.

## Workflow

`draft` → `submitted` → `reviewed` → `approved` → `adjustment_posted` (cancel before post).

## Rules

1. Non-zero difference requires `reason`.
2. Variance ≥ 10% of system qty (Nest `STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT`) flags large variance / director approve.
3. **Post** writes immutable ledger `adjustment` rows (`referenceType: stock_count`).

## UI

`CountGrid`, `AdjustmentPreview`, large-variance banner, photo document id field, status workflow actions.

## Tests

- `variance.test.ts` — threshold / reason / adjustment preview
- `validation.test.ts` — difference reason required
- `roleAccess.test.ts` / `workflowActions.test.ts` — Nest permission gating
