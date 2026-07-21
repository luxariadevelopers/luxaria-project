# Work Measurements — SE Integration (Phase 5 W4)

## Status

Implemented in-module. **No new permissions.** Parent merge is only needed if WorkMeasurementsModule registration or docs drift.

## Workflow

```
Draft → Submitted → Verified → Certified
              ↘ Rejected → Draft (after edit) → …
Draft / Rejected → Cancelled
```

| Step | Endpoint | Permission | Side effect |
|------|----------|------------|-------------|
| Submit | `POST …/:id/submit` | `measurement.create` | — |
| Verify (engineer) | `POST …/:id/verify` | `measurement.certify` | No BOQ update |
| Certify / approve | `POST …/:id/certify` or `…/approve` | `measurement.certify` | Sets `BoqItem.progressQuantity` |
| Reject | `POST …/:id/reject` | `measurement.certify` | — |

Certifier / verifier must differ from `measuredBy`.

## New / extended fields

| Field | Notes |
|-------|--------|
| `siteId` | Optional; site-access enforced via `assertSiteAccessIfScoped` |
| `dprId` | Optional; validated against project (+ site when both set); `$addToSet` on `DPR.workMeasurementIds` |
| `sheetReference` | Measurement book / sheet ref |
| `workDescription` | Sheet narrative |
| `drawingId` | Nullable ObjectId for future drawing register (alongside `drawingReference`) |
| `certifiedBy` / `certifiedAt` | Set on certify |

List filters: `projectId`, `siteId`, `dprId`, `contractorId`, `boqItemId`, `status`, date range.

## BOQ progress

- `BoqItem.progressQuantity` (default `0`) — **not** editable via BOQ item CRUD.
- On certify: recomputed as **max** `cumulativeQuantity` among **certified** measurements for that `boqItemId`, then `BoqService.applyCertifiedProgressQuantity`.
- Public BOQ item also exposes computed `progressPercent`.

## Permissions (reuse — no catalog change)

| Code | Usage |
|------|--------|
| `measurement.view` | List / get |
| `measurement.create` | Create, update, submit, cancel |
| `measurement.certify` | Verify, certify/approve, reject |

## Module imports (already in `work-measurement.module.ts`)

- `SitesModule` (site resolve + access)
- `BoqModule` (`applyCertifiedProgressQuantity`)
- `DailyProgressReport` schema (dpr link + `workMeasurementIds`)

No `app.module.ts` change expected (module already registered).

## Web / mobile

- Types + list query support `siteId` / `dprId` / `drawingId` / sheet fields / `certified`.
- Web: Certify row action on Verified measurements.
- Mobile: `certifyWorkMeasurement` API helper.

## Parent follow-ups (optional)

1. DPR approve snapshot of physical progress from certified measurements (W1/W2 engine).
2. Wire `drawingId` to drawings module once W8 lands.
3. Dashboard aggregations already accept `verified | certified` for continuity.
