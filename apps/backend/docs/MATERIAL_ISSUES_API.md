# Material Issues API — Luxaria Developers ERP

Base path: `/api/v1/material-issues`  
Swagger tag: **Material Issues**

## Permissions

| Permission | Usage |
|------------|--------|
| `stock.view` | List, get |
| `stock.issue` | Create, update, signatures, submit, returns, cancel |
| `stock.adjust` | Confirm (posts ledger / reduces stock) |

## Numbering

| Entity | Format |
|--------|--------|
| `NumberEntityType.MATERIAL_ISSUE` | `MI-YYYY-######` (FY + project-scoped) |
| `NumberEntityType.MATERIAL_RETURN` | `MR-YYYY-######` (FY + project-scoped) |

## Workflow

```
Draft → Submitted → Confirmed
         ↘ Cancelled
```

Stock is reduced **only on confirm**. Returns are allowed only after confirm.

## Rules

1. `workLocation` and `boqItemId` are required (link issue to work + BOQ).
2. Recipient signature (`documentId` + SHA-256 checksum) is required before submit/confirm.
3. Available stock is checked on submit and confirm; confirm posts immutable `material_issue` ledger rows.
4. Returns post `return_from_work` ledger rows and cannot exceed remaining issued quantity.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/material-issues` |
| `GET` | `/material-issues` |
| `GET` | `/material-issues/:id` |
| `PATCH` | `/material-issues/:id` |
| `POST` | `/material-issues/:id/signatures` |
| `POST` | `/material-issues/:id/submit` |
| `POST` | `/material-issues/:id/confirm` |
| `POST` | `/material-issues/:id/returns` |
| `POST` | `/material-issues/:id/cancel` |
