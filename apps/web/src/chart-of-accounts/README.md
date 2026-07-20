# Chart of accounts (Micro Phases 041–042)

Routes:
- `/accounting/chart-of-accounts` — tree + detail (Phase 041)
- `/accounting/chart-of-accounts/new` — create form (Phase 042)
- `/accounting/chart-of-accounts/:accountId/edit` — edit form (Phase 042)

Nav: **Accounting → Chart of Accounts** (`projectScope: none`). Create/edit open from the COA page (New account, Edit, Add child).

## APIs

Base: `/accounts`

| Endpoint | Permission |
|----------|------------|
| `GET /tree` · `GET /` · `GET /:id` · `GET /by-code/:code` | `account.view` |
| `POST /` · `PATCH /:id` · `POST /:id/parent` · `POST /:id/activate` · `POST /:id/deactivate` · `DELETE /:id` · `POST /seed-standard` | `account.manage` |

Nest has **no** `account.create` / `account.update` codes — create/edit routes and mutations use `account.manage` (edit page loads with `account.view`, save needs manage).

## UI

| Piece | Role |
|-------|------|
| `AccountTree` | Expandable hierarchy from `GET /accounts/tree` |
| `AccountDetailDrawer` | Detail + activate/deactivate/delete; Edit / Add child navigate to form pages |
| `AccountForm` | Shared create/edit: type, category, parent, control, allowManualPosting, requiresProject, requiresParty |
| `AccountCreatePage` / `AccountEditPage` | Dedicated form routes |

## Posting rules (client preview; Nest authoritative)

1. Create default: `allowManualPosting = !isControlAccount` (unless explicitly set)
2. `requiresProject` / `requiresParty` default false; when true, journals need those dimensions
3. Child `accountType` must match parent
4. `isSystem` accounts: type locked; no delete
5. `accountCode` immutable after create
6. Route guard + Nest 403 — hiding buttons is not enough
