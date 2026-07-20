# Work Measurements API — Luxaria Developers ERP

Base path: `/api/v1/work-measurements`  
Swagger tag: **Work Measurements**

## Workflow

```
Draft → Submitted → Verified
              ↘ Rejected → Draft (after edit) → Submitted → Verified
Draft / Rejected → Cancelled
```

Engineer verification is mandatory (`verifiedBy` set on verify). The verifier cannot be the same user as `measuredBy`.

## Fields

| Field | Notes |
|-------|--------|
| `measurementNumber` | Auto `WM-YYYY-######` (project-scoped) |
| `projectId` | Required |
| `contractorId` | Opaque ObjectId |
| `boqItemId` | Must be on the **active** BOQ version |
| `location` | Site location text |
| `measurementDate` | Calendar date (UTC midnight) |
| `previousQuantity` | Sum of prior submitted/verified `currentQuantity` for same project + BOQ + contractor |
| `currentQuantity` | This period |
| `cumulativeQuantity` | previous + current |
| `unit` | Taken from BOQ item |
| `measuredBy` | Defaults to creator |
| `verifiedBy` | Set on engineer verify |
| `photos` | Document IDs (`photoDocumentIds` / offline `attachments`) |
| `drawingReference` | Optional |
| `status` | `draft` \| `submitted` \| `verified` \| `rejected` \| `cancelled` |

## Rules

1. **Cumulative ≤ BOQ quantity** — `cumulativeQuantity` cannot exceed the BOQ item `plannedQuantity` on the active version. To measure beyond the original BOQ, activate an **approved** variation / change-order that raises planned quantity.
2. **Engineer verification** — Submitted measurements must be verified by a different user with `measurement.certify`.
3. Only active-version, non-cancelled BOQ items can be measured.

## Permissions

| Permission | Usage |
|------------|--------|
| `measurement.view` | List / get |
| `measurement.create` | Create, update, submit, cancel |
| `measurement.certify` | Verify, reject |

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/work-measurements` |
| `GET` | `/work-measurements` |
| `GET` | `/work-measurements/:id` |
| `PATCH` | `/work-measurements/:id` |
| `POST` | `/work-measurements/:id/submit` |
| `POST` | `/work-measurements/:id/verify` |
| `POST` | `/work-measurements/:id/reject` |
| `POST` | `/work-measurements/:id/cancel` |

## Numbering

`WM-YYYY-######` (project-scoped)
