# Micro Phase 082 — Completion report

## Delivered

| Item | Status |
|------|--------|
| Module `apps/web/src/dpr/` | Done |
| List page `/project-control/dpr` | Done (`DprListPage`) |
| Nav **Project Control → Daily progress** | Done |
| Legacy redirect `/daily-progress-reports` → `/project-control/dpr` | Done |
| Detail stub `/project-control/dpr/:id` (083 placeholder) | Done |
| Missing-day + cut-off indicators | Done |
| Filters (status, date range) + server pagination | Done |
| UX states (loading, empty, error, permission-denied, retry) | Done |
| Unit tests (`missingDay.test.ts`) | Done |
| `docs/ui-api-matrix.md` | Updated |

## Nest APIs used (`DPR_API.md`)

- `GET /daily-progress-reports` — `dpr.view` (list filters: `projectId`, `status`, `fromDate`, `toDate`, `page`, `limit`)
- `GET /daily-progress-reports/missing-alerts` — `dpr.view`

Not wired on list (083+ / review workflows): create, submit, review, reopen, PDF regenerate.

## Permissions

Nest catalog only: `dpr.view` | `dpr.create` | `dpr.review`.

## Nav / route reconciliation snippets

### `routeRegistry.ts`

```typescript
{
  id: 'daily-progress',
  path: '/project-control/dpr',
  title: 'Daily progress',
  layout: 'app',
  showInNav: true,
  groupId: 'project-control',
  icon: 'dpr',
  anyOf: ['dpr.view'],
  projectScope: 'required',
  breadcrumbSegment: 'dpr',
},
{
  id: 'daily-progress-detail',
  path: '/project-control/dpr/:id',
  title: 'Daily progress report',
  layout: 'app',
  showInNav: false,
  anyOf: ['dpr.view'],
  projectScope: 'required',
  breadcrumbSegment: 'detail',
},
{
  id: 'daily-progress-legacy',
  path: '/daily-progress-reports',
  title: 'Daily progress',
  layout: 'app',
  showInNav: false,
  anyOf: ['dpr.view'],
  projectScope: 'required',
  breadcrumbSegment: 'daily-progress-reports',
},
```

### `routes/index.tsx`

```tsx
<Route element={<RegistryRouteGuard routeId="daily-progress" />}>
  <Route
    path={toRelativeAppPath('/project-control/dpr')}
    element={APP_ROUTE_ELEMENTS['daily-progress']}
  />
</Route>
<Route element={<RegistryRouteGuard routeId="daily-progress-detail" />}>
  <Route
    path={toRelativeAppPath('/project-control/dpr/:id')}
    element={APP_ROUTE_ELEMENTS['daily-progress-detail']}
  />
</Route>
<Route element={<RegistryRouteGuard routeId="daily-progress-legacy" />}>
  <Route
    path={toRelativeAppPath('/daily-progress-reports')}
    element={<DailyProgressLegacyRedirect />}
  />
</Route>
```

### `dpr/routes.ts`

```typescript
export const DPR_ROUTES = {
  list: '/project-control/dpr',
  detail: (id: string) => `/project-control/dpr/${encodeURIComponent(id)}`,
  legacyList: '/daily-progress-reports',
} as const;
```

## Out of scope

- Micro Phase 083 detail/editor (stub link + placeholder page only)
- Invented endpoints or permissions
