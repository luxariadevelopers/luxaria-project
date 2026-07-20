# Labour categories (Micro Phase 090)

Route: `/contractors/labour-categories`  
Nav: **Contractors → Labour Categories** (`projectScope: none`)

## APIs

Base: `/labour-categories` (Swagger tag **Labour Categories**)

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` · `GET /by-code/:code` · `GET /resolve-rate` · `GET /:id/rates` | `labour_category.view` |
| `POST /` · `PATCH /:id` · `POST /:id/activate` · `POST /:id/deactivate` · `POST /seed-standard` · `POST /:id/rates` · `PATCH /rates/:rateId` | `labour_category.manage` |

## UI

| Piece | Role |
|-------|------|
| `LabourCategoryTable` | List skills, company rates, status |
| `RateOverridePanel` | Project / contractor overrides + resolve preview |
| `CategoryFormDrawer` / `RateFormDrawer` | Create/update (rates ≥ 0, valid effective dates) |

## Rules (client preview; Nest authoritative)

1. Rates non-negative
2. Rate override requires `projectId` and/or `contractorId`
3. Resolve priority: project+contractor → project → contractor → company defaults
4. Route guard + Nest **403** — hiding buttons is not enough

## Tests

- `resolveRateOverride.test.ts` — override selection priority / effective dates
- `validation.test.ts` — non-negative rates, scoped overrides
- `roleAccess.test.ts` — Nest `labour_category.view` / `manage`
