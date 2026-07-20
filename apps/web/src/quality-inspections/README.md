# Quality inspections (Micro Phase 069)

Route: `/inventory/quality-inspections`  
Nav: **Inventory → Quality Inspections** (`projectScope: required`)

## APIs

Base: `/quality-inspections` (Swagger tag **Quality Inspections**)

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` · `GET /vendors/:vendorId/quality-score` | `quality.view` |
| `POST /` · `PATCH /:id` · `POST /:id/complete` · `POST /:id/cancel` | `quality.inspect` |

GRN picker uses `GET /goods-receipts` (`grn.create`) and filters to
`submitted` / `quality_check`.

Catalog has **no** `quality_inspection.view|create|approve` aliases. Nest
“submit/result” is `POST …/complete` with `result` + line decisions.

## Results

| Result | Line rules |
|--------|------------|
| `accepted` | All accepted qty; no rejected qty |
| `partially_accepted` | Both accepted and rejected qty; reason when rejected &gt; 0 |
| `rejected` | All rejected qty + reasons; no accepted qty |
| `hold` | No line payload; GRN stays in quality check |

## UI

1. List — filters by status/result; create drawer (`InspectionForm`)
2. Detail — parameter grid, sample media, line quantities, result actions
3. Route guard + Nest 403 — hiding buttons is not enough

## Components

`InspectionForm`, `ParameterGrid`, `SampleMediaPanel`, `ResultActions`,
`InspectionLinesGrid`, `QualityInspectionTable`

## Tests

- `validation.test.ts` — accepted / partial / rejected / hold flows
- `roleAccess.test.ts` — Nest permission codes
- `workflowActions.test.ts` — status gating
