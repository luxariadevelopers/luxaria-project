# Stock Counts API — Luxaria Developers ERP

Base path: `/api/v1/stock-counts`  
Swagger tag: **Stock Counts**

## Permissions

| Permission | Usage |
|------------|--------|
| `stock.view` | List, get; approve endpoint gate (service enforces adjust/director) |
| `stock.adjust` | Create, update, submit, review, post; approve when variance is not large |
| `stock.count.director_approve` | Approve counts with large variances |

## Numbering

`NumberEntityType.STOCK_COUNT` → `SC-YYYY-######` (FY + project-scoped).

## Workflow

```
Draft → Submitted → Reviewed → Approved → Adjustment Posted
```

Cancel is allowed before adjustment posting.

## Rules

1. Any non-zero `difference` (`physical − system`) requires a `reason`.
2. Variance ≥ `STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT` (default **10%**) of system qty flags `requiresDirectorApproval` and needs `stock.count.director_approve`.
3. **Post** writes immutable stock ledger `adjustment` rows and a posted stock-adjustment journal (WIP ↔ Direct Expense / Other Income) valued at material `standardRate`.
4. System quantities are refreshed from stock balances on submit.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/stock-counts` |
| `GET` | `/stock-counts` |
| `GET` | `/stock-counts/:id` |
| `PATCH` | `/stock-counts/:id` |
| `POST` | `/stock-counts/:id/submit` |
| `POST` | `/stock-counts/:id/review` |
| `POST` | `/stock-counts/:id/approve` |
| `POST` | `/stock-counts/:id/post` |
| `POST` | `/stock-counts/:id/cancel` |

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT` | `10` | Absolute % of system qty that escalates to director approval |
