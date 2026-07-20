# Approval Workflow Engine — Luxaria Developers ERP

Base paths:

- `/api/v1/approval-workflows`
- `/api/v1/projects/:projectId/approvals`

Auth: Bearer access token  
Swagger tag: **Approvals**

Reusable maker-checker engine for any module/entity with amount-based steps, project access, and an immutable history log.

## Statuses

| Status | Meaning |
|--------|---------|
| `draft` | Created, not yet submitted |
| `pending` | Awaiting action on `currentStep` |
| `approved` | All applicable steps completed |
| `rejected` | Rejected at current step |
| `cancelled` | Withdrawn |
| `returned` | Sent back for correction (requester may resubmit) |

## Permissions

| Permission | Use |
|------------|-----|
| `approval.configure` | Upsert / view workflow definitions |
| `approval.view` | List, get, timeline |
| `approval.act` | Create, submit, approve, reject, return, escalate, cancel (own) |
| `approval.cancel` | Cancel another user’s open request |

## Workflow configuration

`PUT /approval-workflows`

Step fields:

- `stepNumber`, `roleIds`, `specificUserIds`
- `minimumAmount`, `maximumAmount` (null = no upper bound)
- `requiresAll` — all `specificUserIds` must approve (or N distinct approvers when only roles)
- `escalationHours`, `fallbackRole`
- `allowSelfApprove` (workflow-level, default `false`)

Numbering: `APR-YYYY-######` (project-scoped).

## Request lifecycle

1. `POST /projects/:projectId/approvals` — draft (optional `submit: true`)
2. `POST .../:id/submit` — draft/returned → pending
3. `POST .../:id/approve` | `reject` | `return` | `escalate` | `cancel`
4. `GET .../:id/timeline` — immutable event log

## Rules

1. **Self-approve** — requester cannot approve/reject/return own request unless `allowSelfApprove`
2. **Project access** — create/update/approve/read go through `ProjectAccessService`
3. **Amount limits** — only steps whose min/max cover the request amount apply
4. **Immutable history** — `approval_history` is insert-only (updates/deletes blocked)

## Timeline actions

`submitted` · `approved` · `rejected` · `returned` · `cancelled` · `escalated`
