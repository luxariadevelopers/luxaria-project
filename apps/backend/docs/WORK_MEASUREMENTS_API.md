# Work Measurements API — Luxaria Developers ERP

Base path: `/api/v1/work-measurements`  
Swagger tag: **Work Measurements**

## Workflow

```
Draft → Submitted → Verified → Certified
              ↘ Rejected → Draft (after edit) → Submitted → Verified → Certified
Draft / Rejected → Cancelled
```

1. **Submit** — site engineer submits the measurement sheet.  
2. **Verify** — different engineer verifies evidence (`measurement.certify`). Does **not** update BOQ progress.  
3. **Certify / approve** — certifies the verified sheet (`measurement.certify`) and syncs `BoqItem.progressQuantity`.

## Fields

| Field | Notes |
|-------|--------|
| `measurementNumber` | Auto `WM-YYYY-######` (project-scoped) |
| `projectId` | Required |
| `siteId` | Optional site scope |
| `dprId` | Optional Daily Progress Report link; list filter supported |
| `contractorId` | Opaque ObjectId |
| `boqItemId` | Must be on the **active** BOQ version |
| `location` | Site location text |
| `sheetReference` | Measurement book / sheet reference |
| `workDescription` | Work described on the sheet |
| `measurementDate` | Calendar date (UTC midnight) |
| `previousQuantity` | Sum of prior submitted/verified/certified `currentQuantity` for same project + BOQ + contractor |
| `currentQuantity` | This period |
| `cumulativeQuantity` | previous + current |
| `unit` | Taken from BOQ item |
| `measuredBy` | Defaults to creator |
| `verifiedBy` / `verifiedAt` | Set on engineer verify |
| `certifiedBy` / `certifiedAt` | Set on certify |
| `photos` | Document IDs (`photoDocumentIds` / offline `attachments`) |
| `drawingReference` | Optional free-text drawing ref |
| `drawingId` | Optional ObjectId for future drawing register |
| `status` | `draft` \| `submitted` \| `verified` \| `certified` \| `rejected` \| `cancelled` |

## Rules

1. **Cumulative ≤ BOQ quantity** — `cumulativeQuantity` cannot exceed the BOQ item `plannedQuantity` on the active version. To measure beyond the original BOQ, activate an **approved** variation / change-order that raises planned quantity.
2. **Engineer verification** — Submitted measurements must be verified by a different user with `measurement.certify`.
3. **Certify → progress** — Only verified measurements can be certified. Certify sets BOQ `progressQuantity` to the max certified `cumulativeQuantity` for that BOQ item.
4. Only active-version, non-cancelled BOQ items can be measured.
5. When `dprId` is set, the DPR must belong to the same project (and same site when both measurement and DPR have `siteId`).

## Permissions

| Permission | Usage |
|------------|--------|
| `measurement.view` | List / get |
| `measurement.create` | Create, update, submit, cancel |
| `measurement.certify` | Verify, certify/approve, reject |

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/work-measurements` |
| `GET` | `/work-measurements` |
| `GET` | `/work-measurements/:id` |
| `PATCH` | `/work-measurements/:id` |
| `POST` | `/work-measurements/:id/submit` |
| `POST` | `/work-measurements/:id/verify` |
| `POST` | `/work-measurements/:id/certify` |
| `POST` | `/work-measurements/:id/approve` |
| `POST` | `/work-measurements/:id/reject` |
| `POST` | `/work-measurements/:id/cancel` |

List query params include: `projectId`, `siteId`, `dprId`, `contractorId`, `boqItemId`, `status`, `fromDate`, `toDate`, pagination.

## Numbering

`WM-YYYY-######` (project-scoped)
