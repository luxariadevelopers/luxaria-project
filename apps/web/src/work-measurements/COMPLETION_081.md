# Micro Phase 081 — Completion report

## Files / endpoints used

| Layer | Path |
|-------|------|
| API doc | `apps/backend/docs/WORK_MEASUREMENTS_API.md` |
| Controller | `apps/backend/src/modules/work-measurements/work-measurement.controller.ts` |
| Web module | `apps/web/src/work-measurements/` |
| Page | `apps/web/src/pages/WorkMeasurementsPage.tsx` |
| Matrix | `docs/ui-api-matrix.md` |

**Nest endpoints:** `POST/GET /work-measurements`, `GET/PATCH /work-measurements/:id`, `POST …/submit`, `…/verify`, `…/reject`, `…/cancel`  
**Supporting:** `GET /boq/projects/:projectId/items`, `GET /contractors`

## Delivered

| Item | Status |
|------|--------|
| Route `/project-control/work-measurements` | Done (`work-measurements` registry + `RegistryRouteGuard`) |
| Module `apps/web/src/work-measurements` | Done |
| List table + filters (status, contractor, BOQ, dates) | Done |
| Create / edit drawer (`MeasurementForm`) | Done |
| Submit / verify / reject / cancel workflow | Done |
| Over-BOQ client validation | Done (`validation.ts` mirrors Nest) |
| Capabilities via `measurement.view/create/certify` | Done |
| Tests (`validation.test.ts`, `roleAccess.test.ts`) | Done (8) |
| Docs (module README, ui-api-matrix) | Done |

## Permissions note

Phase brief listed `work_measurement.view/create/verify`. Nest catalog uses **`measurement.view`**, **`measurement.create`**, **`measurement.certify`**. Verify UI maps to `measurement.certify`; client does not invent aliases.

## Merge reconciliation — route registry

Add to `apps/web/src/navigation/routeRegistry.ts` (project-control group):

```typescript
{
  id: 'work-measurements',
  path: '/project-control/work-measurements',
  title: 'Work Measurements',
  layout: 'app',
  showInNav: true,
  groupId: 'project-control',
  icon: 'projects',
  anyOf: ['measurement.view'],
  projectScope: 'required',
  breadcrumbSegment: 'work-measurements',
},
```

Add to `ROUTE_LABELS`: `'work-measurements': 'Work Measurements'`

## Merge reconciliation — routes index

In `apps/web/src/routes/index.tsx`:

1. Import `WorkMeasurementsPage`
2. `APP_ROUTE_ELEMENTS['work-measurements'] = <WorkMeasurementsPage />`
3. Guard block:

```tsx
<Route element={<RegistryRouteGuard routeId="work-measurements" />}>
  <Route
    path={toRelativeAppPath('/project-control/work-measurements')}
    element={APP_ROUTE_ELEMENTS['work-measurements']}
  />
</Route>
```

## Acceptance

Users with `measurement.view` can list project-scoped work measurements; `measurement.create` can draft, edit (draft/rejected), submit, and cancel; engineers with `measurement.certify` (≠ `measuredBy`) can verify or reject. Cumulative quantity over BOQ is blocked client-side and backend errors are surfaced.

## Out of scope

- Other micro phases
- Invented API paths, DTO fields, permissions, or statuses
- Mobile / offline sync UI
