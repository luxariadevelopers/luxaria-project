# Work Measurement (Mobile — Micro Phase 129)

Capture verified work quantities with evidence at site; engineer verification happens later (web / certify flow).

## Navigation

**Home → Work Measurement** → list → **New measurement** form.

| Screen | Route name | Permission gate |
|--------|------------|-----------------|
| List | `WorkMeasurementList` | `measurement.view` |
| Form | `WorkMeasurementForm` | `measurement.create` |

## Nest APIs (existing only)

See [`WORK_MEASUREMENTS_API.md`](../../../backend/docs/WORK_MEASUREMENTS_API.md).

| Method | Path | Permission | Mobile use |
|--------|------|------------|------------|
| GET | `/work-measurements` | `measurement.view` | List + previous qty hint |
| POST | `/work-measurements` | `measurement.create` | Offline sync create+submit (`submit: true`) |
| GET | `/boq/projects/:projectId/items` | `boq.view` | BOQ picker |
| GET | `/contractors` | `contractor.view` | Contractor picker |

Submit-only / verify / reject are available on Nest but certify is not part of this mobile capture phase (`measurement.certify`).

## Permissions note

Phase brief alias `work_measurement.create` is **not** in the Nest catalog. Mobile uses `measurement.create` / `measurement.view`.

## Offline sync

`buildMeasurementOfflineEnqueue` queues `work_measurement.create` → `POST /work-measurements` with `submit: true`. Sync uploads photos first (`photo_0`…); Nest merges via `attachments` / `mergePhotoDocumentIds`.

## Validation

Client mirrors Nest cumulative ≤ BOQ planned quantity (`validateCumulativeWithinBoq`). Server remains authoritative (active BOQ version, approved variations). Over-BOQ is blocked before enqueue.

## Acceptance

- Site can capture BOQ item, location, previous/current quantity, photos, drawing reference.
- Offline queue holds the measurement until online.
- Over-BOQ conflict is rejected client-side; sync will also fail if BOQ moved on server.
- Later engineer verification uses Nest `measurement.certify` (outside this phase UI).

## Module layout

| Path | Role |
|------|------|
| `api.ts` | HTTP client |
| `types.ts` | Public DTOs |
| `validation.ts` | Over-BOQ + form rules |
| `permissions.ts` | Capability map |
| `buildMeasurementOfflineEnqueue.ts` | Offline queue builder |
| `components/` | List row + loading/empty/error/403 panels |
| `screens/WorkMeasurement*Screen.tsx` | List + form UI |

## Completion report (Phase 129)

| Item | Status |
|------|--------|
| Measurement list screen | Done |
| Measurement form (BOQ, location, prev/curr qty, photos, drawing) | Done |
| Offline create/submit enqueue | Done |
| Cumulative ≤ BOQ validation | Done (+ unit tests) |
| Permissions `measurement.create` / `measurement.view` | Done |
| Nav Home → Work Measurement | Done |
| Tests: offline enqueue + over-BOQ conflict | Done |
| `docs/ui-api-matrix.md` mobile rows | Done |
| Typecheck / lint / unit tests | Run in verification |
