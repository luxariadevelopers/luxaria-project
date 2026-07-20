# Approvals (Micro Phases 014 + 027 + 028)

Project-scoped approval work queue at `/approvals` (nav: **Approvals → Pending**)
and detail/actions at `/approvals/:approvalId` (deep link from the inbox).

## Permissions (Nest catalog — do not invent)

| Surface | Permission |
|---------|------------|
| List + detail + timeline | `approval.view` |
| Approve / reject / return | `approval.act` |
| Cancel another user’s request | `approval.cancel` (requester may cancel without it) |
| Workflow configure | `approval.configure` |

There are **no** `approval.approve` / `approval.reject` / `approval.return`
permission codes in the RBAC catalog.

Hiding buttons is not enough: `RegistryRouteGuard` + `ProjectRequiredRoute`,
action status allow-lists, and backend 403/409 handling still apply.

## APIs consumed

| Endpoint | Use |
|----------|-----|
| `GET /projects/:projectId/approvals` | Inbox list |
| `GET /projects/:projectId/approvals/:id` | Detail |
| `GET /projects/:projectId/approvals/:id/timeline` | Immutable timeline |
| `POST .../:id/approve` | Approve current step (`{ comment? }`) |
| `POST .../:id/reject` | Reject (`{ comment? }`) |
| `POST .../:id/return` | Return for correction (`{ comment? }`) |
| `POST .../:id/cancel` | Cancel (`{ reason? }`) |

### List query (Nest — do not invent)

| Param | Notes |
|-------|--------|
| `status` | `draft` \| `pending` \| `approved` \| `rejected` \| `cancelled` \| `returned` |
| `module` | string |
| `entityType` | string |
| `page` | ≥ 1 |
| `limit` | 1…100 |

Amount / ageing filters on the inbox are **client-side** only.

## Detail actions (Phase 028)

| Rule | Behaviour |
|------|-----------|
| Comment required | UI requires comment for **reject** and **return** |
| Self-approval | Nest returns 403 (`Requester cannot act…`); UI does not invent `allowSelfApprove` |
| Already acted | Nest 409 conflict → warning + refetch; **no optimistic updates** |
| Documents | `DocumentListPanel` for `entityType` / `entityId` (`document.view`) |

## Components

| Export | Role |
|--------|------|
| `ApprovalTable` | Inbox DataTable + saved preferences |
| `ApprovalHeader` | Detail header + ageing + back to inbox |
| `ApprovalEntitySummary` | Amount, step, entity, requester |
| `ApprovalActionDialog` | Approve / reject / return / cancel confirm |
| `useApprovalActions` | Mutations without optimistic cache writes |
| `validateApprovalAction` | Comment rules for reject/return |

## Navigation

Registry id `approvals`: path `/approvals`, title **Pending**, group **Approvals**,
`projectScope: required`, `anyOf: ['approval.view']`. Detail shares the same
route guard (`approvals/:approvalId`).
