# Period Closure (Micro Phase 055)

Route: `/accounting/period-close`  
Nav: **Accounting → Period Closure** (`period_closure.view`, `projectScope: none`)

Company / financial-year scoped Nest module — no project header requirement.

## Nest permissions (not `period_close.*`)

| UI action | Permission |
|-----------|------------|
| List, detail, checklist, reopen history | `period_closure.view` |
| Create, validate, lock, close | `period_closure.manage` |
| Request reopen | `period_closure.reopen` |
| Approve / reject reopen | `period_closure.approve_reopen` |
| FY filter / create picker | `financial_year.view` |

## APIs

Base: `/accounting-period-closure`

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/periods` | `period_closure.manage` |
| `GET` | `/periods` | `period_closure.view` |
| `GET` | `/periods/:periodId` | `period_closure.view` |
| `GET` | `/periods/:periodId/checklist` | `period_closure.view` |
| `POST` | `/periods/:periodId/validate` | `period_closure.manage` |
| `POST` | `/periods/:periodId/lock` | `period_closure.manage` |
| `POST` | `/periods/:periodId/close` | `period_closure.manage` |
| `POST` | `/periods/:periodId/reopen-requests` | `period_closure.reopen` |
| `GET` | `/periods/:periodId/reopen-requests` | `period_closure.view` |
| `POST` | `/periods/:periodId/reopen-requests/:requestId/approve` | `period_closure.approve_reopen` |
| `POST` | `/periods/:periodId/reopen-requests/:requestId/reject` | `period_closure.approve_reopen` |

Statuses: period `open` · `locked` · `closed`; checklist `pending` · `passed` · `failed`; reopen `pending` · `approved` · `rejected`.

## UI pieces

| Piece | Role |
|-------|------|
| `ClosingChecklist` | Pre-close checklist rows |
| `BlockingIssuesPanel` | Failed checks + issue detail |
| `LockPeriodDialog` | Confirms lock; disabled when gate fails |
| `PeriodReopenHistory` | Reopen request history + approve/reject |
| `ReopenRequestDialog` | Reason required (Nest min 5) |
| `canLockPeriod` | Client gate matching Nest lock rules |

## Rules

1. Cannot lock with unresolved blocking checklist failures (`canLockPeriod` + Nest `400`)
2. Reopen requires reason (min 5); approver ≠ requester
3. Route guard + Nest `403` — hiding buttons is not enough
4. Close only after lock (`period_closure.manage`)
