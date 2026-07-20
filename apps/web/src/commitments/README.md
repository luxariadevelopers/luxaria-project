# Contribution commitments (Micro Phase 037)

Route: `/capital/commitments`  
Nav: **Capital & Investment → Commitments** (`projectScope: required`)

## APIs

Base: `/projects/:projectId/commitments`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /summary` | `contribution_commitment.view` |
| `POST /` | `contribution_commitment.create` |
| `POST /:id/submit` | `contribution_commitment.submit` |
| `POST /:id/approve` | `contribution_commitment.approve` |
| `POST /:id/amend` | `contribution_commitment.amend` |
| `POST /:id/cancel` | `contribution_commitment.cancel` |

Catalog has **no** `commitment.view` / `commitment.create` aliases.

## UI rules

1. Amount summary — Nest summary (approved rows): committed / received / pending
2. Overdue — client filter: approved + `dueDate` before today + `pendingAmount > 0` (Nest alerts deferred)
3. Amendments — version filter (`current` / `amendments` / `superseded`); amend creates a new draft version
4. Create requires contribution type + commitment/due dates
5. Route guard + Nest 403 — hiding buttons is not enough

## Components

`CommitmentTable`, `CommitmentAmountSummary`, `CommitmentFilters`, create/amend/cancel dialogs
