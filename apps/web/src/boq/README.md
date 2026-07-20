# BOQ (Micro Phases 077–080)

Base Nest path: `/boq` — Swagger tag **BOQ**.  
Docs: `apps/backend/docs/BOQ_API.md`, `BOQ_VERSIONS.md`.

## Routes

| Route | Phase | Nav |
|-------|-------|-----|
| `/project-control/boq` | 077 | **Project Control → BOQ** |
| `/project-control/boq/import` | 078 | Deep link from list |
| `/project-control/boq/items/:id` (`new` = create) | 079 | Deep link from list / item panel |
| `/project-control/boq/versions` | 080 | **Project Control → BOQ Versions** |

All use `projectScope: required` + `RegistryRouteGuard`.

## Nest permissions (exact)

| Code | UI use |
|------|--------|
| `boq.view` | Hierarchy, items, versions, compare, template, validate-totals |
| `boq.manage` | Create/update items; create/submit/activate versions; Excel import |
| `boq.approve` | Approve / reject pending versions |

Prompt aliases **`boq.create` / `boq.update` / `boq.import` / `boq_version.*` do not exist**.

## Phase 079 — Item editor

- `ItemForm` — cost components, dates, work location (block → floor → category)
- Nest has **no** `contractorId` on items; UI uses `subcontractCost`
- Rules: planned rate/value consistency; `endDate` ≥ `startDate`
- Tests: `calculations.test.ts`, `validation.test.ts`

## Phase 080 — Versions

- `VersionTable`, side-by-side `VersionCompareView`, `ImpactSummary`
- Only one `active` version per project; Variation must submit → approve
- Tests: `activation.test.ts`, `comparison.test.ts`

## Shared module layout

`api.ts` / `useBoq.ts` / `types.ts` / `roleAccess.ts` / `routes.ts` serve 077–080.
Import wizard lives under `boq/import/`.
