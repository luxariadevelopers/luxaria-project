# Weekly Petty-Cash Requirements API — Luxaria Developers ERP

Base path: `/api/v1/petty-cash-requirements`  
Auth: Bearer access token  
Swagger tag: **Petty Cash Requirements**

## Workflow

`draft` → `submitted` → `project_manager_review` → `finance_review` → `approved` → `funded` → `closed`

Also: `returned` · `rejected` · `cancelled`

Integrated with the reusable approval engine (`module=petty_cash`, `entityType=weekly_requirement`) — PM then Finance Manager steps (seeded on boot when roles exist).

## Fields

| Field | Notes |
|-------|--------|
| `requestNumber` | `PCR-YYYY-######` |
| `projectId` / `pettyCashAccountId` | Site petty-cash account |
| `requestedBy` | Requester |
| `weekStartDate` / `weekEndDate` | ≤ 7 days |
| `currentCashBalance` | Snapshot at create/submit |
| `previousUnsettledAmount` | Prior funded-not-closed float |
| `warnings` | Unsettled + unsubmitted expense drafts |
| `requestedAmount` | Sum of requirement items |
| `approvedAmount` | May differ from requested |
| `fundedAmount` | ≤ approved |
| `requirementItems[]` | category, description, estimatedAmount |
| `justification` | Free text |
| `approvalRequestId` | Linked approval |

## Permissions

| Permission | Use |
|------------|-----|
| `petty_cash.view` | List / get |
| `petty_cash.request` | Create, update, submit, cancel |
| `petty_cash.approve` | PM / finance review, reject, return |
| `petty_cash.fund` | Fund, close |

## Rules

1. **Previous unsettled amount** — sum of funded (not closed) prior weeks for the same account
2. **Unsubmitted expenses warning** — draft expense claims with `expenseDate` before week start
3. **No duplicate** — one open request per petty-cash account + week start
4. **Approved ≠ requested** — finance may set a lower/different `approvedAmount`
5. **Approval integration** — submit creates/submits an approval request; PM/finance actions call `ApprovalsService.approve`

## Endpoints

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/petty-cash-requirements` | Create draft |
| `PATCH` | `/:id` | Update draft/returned |
| `POST` | `/:id/submit` | Submit + start approval |
| `POST` | `/:id/project-manager-approve` | PM step |
| `POST` | `/:id/finance-approve` | Finance step (`approvedAmount`) |
| `POST` | `/:id/reject` | Reject |
| `POST` | `/:id/return` | Return for correction |
| `POST` | `/:id/fund` | Fund (manual mark; prefer fund transfers for journal posting) |
| `POST` | `/:id/close` | Close after settlement |
| `POST` | `/:id/cancel` | Cancel draft/returned |
