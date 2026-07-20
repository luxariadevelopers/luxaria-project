# Work Measurements (Web — Micro Phase 081)

Record and verify completed quantities against active BOQ items.

## Route

| Path | Registry id | Permissions |
|------|-------------|-------------|
| `/project-control/work-measurements` | `work-measurements` | `measurement.view` (nav); create/certify via row actions |

Project scope: **required** (`ProjectRequiredRoute`).

## Nest APIs

See [`WORK_MEASUREMENTS_API.md`](../../backend/docs/WORK_MEASUREMENTS_API.md).

| Method | Path | Permission |
|--------|------|------------|
| POST | `/work-measurements` | `measurement.create` |
| GET | `/work-measurements` | `measurement.view` |
| GET | `/work-measurements/:id` | `measurement.view` |
| PATCH | `/work-measurements/:id` | `measurement.create` |
| POST | `/work-measurements/:id/submit` | `measurement.create` |
| POST | `/work-measurements/:id/verify` | `measurement.certify` |
| POST | `/work-measurements/:id/reject` | `measurement.certify` |
| POST | `/work-measurements/:id/cancel` | `measurement.create` |

Supporting lookups (optional, gated by related permissions):

- `GET /boq/projects/:projectId/items` — `boq.view`
- `GET /contractors` — `contractor.view`

## Permissions note

Phase brief aliases (`work_measurement.view/create/verify`) are **not** in the Nest catalog. Verify/reject UI maps to `measurement.certify`.

## Client validation

`validation.ts` mirrors Nest cumulative ≤ BOQ rule before save. Server remains authoritative (active BOQ version, approved variations).

## Module layout

| File | Role |
|------|------|
| `api.ts` | HTTP client |
| `useWorkMeasurements.ts` | React Query hooks |
| `MeasurementTable.tsx` | List + workflow row actions |
| `MeasurementForm.tsx` | Create / edit drawer |
| `RejectMeasurementDialog.tsx` | Engineer reject reason |
| `roleAccess.ts` | Capability map |
| `validation.ts` | Zod + over-BOQ check |
