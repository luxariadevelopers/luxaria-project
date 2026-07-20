# Petty-cash requests (Micro Phases 048–049)

Routes:
- `/accounting/petty-cash/requests` — list / workflow actions (Phase 048)
- `/accounting/petty-cash/requests/new` — create weekly requirement (Phase 049)
- `/accounting/petty-cash/requests/:requestId` — detail, edit draft/returned, approval context (Phase 049)

Nav: **Petty Cash → Fund Requests** (`petty_cash.view`, `projectScope: required`).  
Create is opened from the list toolbar; detail is a deep link from the register.

## APIs

Base: `/petty-cash-requirements`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `petty_cash.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `POST …/cancel` | `petty_cash.request` |
| `POST …/project-manager-approve` · `…/finance-approve` · `…/reject` · `…/return` | `petty_cash.approve` |
| `POST …/fund` · `POST …/close` | `petty_cash.fund` |
| `GET /cash-accounts?kind=petty_cash` · `GET /cash-accounts/:id/balance` | `cash.view` (create picker / live balance) |

Nest catalog uses `petty_cash.*` (not `petty_cash_request.*`).

## UI (Phase 049)

| Piece | Role |
|-------|------|
| `RequirementItemsGrid` | Itemised category / description / amount + requested total |
| `CurrentBalanceCard` | Snapshot balance, previous unsettled, warnings, live balance |
| `ReviewActionDialog` | Detail PM/finance approve, reject, return (+ approved amount) |
| `buildPettyCashRequestTimeline` | Lifecycle from requirement fields |

## Rules

1. Week span ≤ 7 days; end ≥ start (Nest `assertWeek`)
2. Item amounts must be positive; requested total = sum of items
3. One open request per petty-cash account + week (Nest 409; client preview)
4. Only draft / returned are editable; only requester may update/submit (Nest 403)
5. Route guard + Nest 403 — hiding buttons is not enough
6. Active project required (`projectScope: required`)
