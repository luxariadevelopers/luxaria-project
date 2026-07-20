# Daily Progress Reports (web)

Micro Phase **082** — list under Project Control.

| Route | Phase | Notes |
|-------|-------|-------|
| `/project-control/dpr` | 082 | **Project Control → Daily progress** (primary) |
| `/project-control/dpr/:id` | 083 | Detail placeholder until Phase 083 |
| `/daily-progress-reports` | 082 | Legacy redirect → `/project-control/dpr` |

`projectScope: required` + `RegistryRouteGuard` (`dpr.view`).

## Nest APIs

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/daily-progress-reports` | `dpr.view` |
| `GET` | `/daily-progress-reports/missing-alerts` | `dpr.view` |

List query params: `projectId`, `status`, `fromDate`, `toDate`, `page`, `limit`.

Statuses: `draft` | `submitted` | `reviewed` | `reopened`.

Missing-day indicators use evening evaluation (`DPR_MISSING_CRON`, default 20:00):
silent days show **awaiting cut-off** until an alert is raised.

## Module layout

| File | Role |
|------|------|
| `api.ts` | List + missing alerts clients |
| `useDpr.ts` | React Query hooks |
| `DPRTable.tsx` | Server-paged grid (status, media count, detail stub link) |
| `MissingDayIndicators.tsx` | Missing + cut-off banners/chips |
| `missingDay.ts` | `deriveDayCompliance` (unit-tested) |
| `routes.ts` | Canonical paths |

See [`DPR_API.md`](../../../backend/docs/DPR_API.md).
