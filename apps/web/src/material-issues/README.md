# Material issues (Micro Phase 073)

Route: `/inventory/material-issues` (+ `/:issueId`)  
Nav: **Inventory → Material Issues** (`projectScope: required`)

## APIs

Base: `/material-issues` (Swagger tag **Material Issues**)

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `stock.view` |
| `POST /` · `PATCH /:id` · `POST …/signatures` · `POST …/submit` · `POST …/returns` · `POST …/cancel` | `stock.issue` |
| `POST …/confirm` | `stock.adjust` |

Supporting pickers: `GET /stock-ledger/balance` (`stock.view`), `GET /boq/projects/:projectId/items` (`boq.view`), `GET /materials` (`material.view`), `GET /users` (`user.view`), document upload/download for signatures.

Catalog has **no** `material_issue.view|create|confirm` aliases.

## Workflow

`draft` → `submitted` → `confirmed` (or `cancelled` from draft/submitted).  
Stock reduced **only on confirm**. Returns only after confirm.

## Rules (client + server)

1. `workLocation` + `boqItemId` required
2. Recipient signature (document id + SHA-256) before submit/confirm
3. Issue quantity cannot exceed available stock (base unit)
4. Return quantity must be &gt; 0 and ≤ remaining issued

## Components

`IssueForm`, `WorkLocationBoqSelector`, `AvailableStockIndicator`, `SignaturePreview`, `ReturnForm`, `MaterialIssueTable`

## Tests

- `validation.test.ts` — negative-stock prevention + positive return qty
- `roleAccess.test.ts` — Nest `stock.*` codes
- `workflowActions.test.ts` — status gating
