# Expense categories (Micro Phase 051)

Route: `/accounting/expense-categories`

Nav: **Petty Cash → Expense Categories** (`expense_category.view`, `projectScope: none`).

## APIs

Base: `/expense-categories`

| Endpoint | Permission |
|----------|------------|
| `GET /tree` · `GET /` · `GET /:id` · `GET /by-code/:code` | `expense_category.view` |
| `POST /` · `PATCH /:id` · `PATCH /:id/evidence-rules` · `POST /:id/parent` · `POST /:id/activate` · `POST /:id/deactivate` · `DELETE /:id` · `POST /seed-standard` | `expense_category.manage` |
| `GET /accounts?accountType=expense` (ledger picker) | `account.view` |

## UI

| Piece | Role |
|-------|------|
| `CategoryTree` | Expandable hierarchy from `GET /expense-categories/tree` |
| `CategoryDetailDrawer` | Detail + evidence form + ledger mapping + activate/deactivate/delete |
| `EvidenceRulesForm` | Bill / signature / photo toggles + approval limit threshold |
| `LedgerAccountSelector` | Active expense COA accounts only |
| `CreateCategoryDrawer` | Create with required ledger mapping |

## Rules (client preview; Nest authoritative)

1. Create/update require a **default expense ledger** (`defaultLedgerAccountId`)
2. Ledger must be an **active expense** COA account
3. `approvalLimit` ≥ 0; empty/null clears the threshold
4. Cannot deactivate a parent while active children exist
5. System-seeded categories cannot be deleted
6. Route guard + Nest **403** — hiding buttons is not enough
