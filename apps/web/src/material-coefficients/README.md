# Material consumption standards (Micro Phase 084)

Route: `/project-control/material-coefficients`  
Nav: **Project Control → Consumption Standards**

## APIs

Base: `/material-consumption-standards`  
Swagger tag: **Material Consumption Standards**  
Contract: [`apps/backend/docs/MATERIAL_CONSUMPTION_STANDARDS_API.md`](../../../backend/docs/MATERIAL_CONSUMPTION_STANDARDS_API.md)

| Endpoint | Permission |
|----------|------------|
| `POST /` · `GET /` · `GET /resolve` · `GET /:id` | `material_consumption.view` (read) / `.manage` (create) |
| `PATCH /:id` · `POST /:id/versions` · `POST /:id/submit` | `material_consumption.manage` |
| `POST /:id/approve` · `POST /:id/reject` | `material_consumption.approve` |

There are **no** `material_coefficient.*` permissions in the Nest catalog.

## UI

1. **CoefficientTable** — standard number, version, scope (company / project override), work type or BOQ, material, units, std qty, wastage %, effective qty, effective date, status
2. **Scope toggle** — company-wide (`globalOnly`) vs project (`projectId` from header selector)
3. **Create / edit form** — work type or BOQ item, output unit, material, consumption + wastage, effective date, optional override link
4. **Version flow** — new draft from active / superseded / rejected; submit → pending → approve (supersedes prior active) or reject
5. **Client validation** — mirrors Nest: positive qty, wastage 0–100, boq/work type required, one open version per scope

## Workflow

`draft` → `pending_approval` → `active` · `rejected` → edit → … · `active` → (new version) → `draft` → … (prior → `superseded`)

## Tests

- `validation.test.ts` — qty/wastage, scope keys, overlapping / open-version rules
- `workflowActions.test.ts` — action gating by status + permission
- `roleAccess.test.ts` — exact Nest permission codes
