# Site Execution W1+W2 — Parent merge integration notes

This module was extended for Phase 5 waves **W1** (site-scoped DPR + workflow) and **W2** (material consumption wiring). Shared catalog / app wiring files were **not** edited here — parent merge must apply the following.

## Module imports (`apps/backend/src/app.module.ts`)

`DailyProgressReportsModule` already exists in the app. No new top-level module registration is required.

Ensure these modules remain imported (they already should be after Phase 4):

- `MaterialIssuesModule`
- `StockReservationsModule`
- `SitesModule`

`DailyProgressReportsModule` now imports:

- `SitesModule` (for `SiteAccessService` + `Site` model)
- `MaterialIssuesModule` (confirm path on approve)
- `StockReservationsModule` (soft-reserve on submit, consume on approve)

If Nest reports a circular dependency on `MaterialIssuesModule` ↔ DPR, keep the `forwardRef(() => MaterialIssuesModule)` already present in `dpr.module.ts`.

## Permissions

**Reuse only** (no new codes required for W1/W2):

| Permission   | Endpoints / actions                                      |
|--------------|----------------------------------------------------------|
| `dpr.view`   | list, get, missing alerts                                |
| `dpr.create` | create, update, submit                                   |
| `dpr.review` | verify, approve, lock, review (legacy), reopen, PDF, alerts |

Optional later split (document only — **do not** add unless role separation is needed):

- `dpr.approve` — approve only
- `dpr.lock` — lock only

Until then, PM / SE lead roles that already have `dpr.review` cover verify → approve → lock.

Stock side effects reuse existing:

- `stock.reserve` — soft-reserve on submit (service call; actor must have project access)
- `stock.issue` — material issue confirm posts ledger (via `MaterialIssuesService.confirmForDpr`)

## Index migration (MongoDB)

Schema now defines:

1. `uniq_dpr_project_date` — **non-unique** index (same name kept for migration friendliness)
2. `uniq_dpr_project_site_date_shift` — unique partial on `{ projectId, siteId, reportDate, shift }` where `isDeleted: false` and `siteId` is ObjectId

If the old unique index still exists in a deployed DB, run once before/after deploy:

```js
db.daily_progress_reports.dropIndex('uniq_dpr_project_date')
// then restart app / syncIndexes so non-unique + new unique indexes apply
```

Legacy rows without `siteId` are excluded from the new unique partial index.

## API surface added

| Method | Path | Permission |
|--------|------|------------|
| POST | `/daily-progress-reports/:id/verify` | `dpr.review` |
| POST | `/daily-progress-reports/:id/approve` | `dpr.review` |
| POST | `/daily-progress-reports/:id/lock` | `dpr.review` |

`POST .../review` remains as legacy alias → sets status `reviewed` (approved-like) and runs the same material confirm side effects as approve.

Create now **requires** `siteId`. Optional: location fields, `shift`, `plannedWork`, `delayedWork`, section ref ID arrays.

## Material issues

Optional `dprId` on create/update. DPR approve calls `MaterialIssuesService.confirmForDpr` (draft/submitted → confirmed + ledger) without requiring recipient signature.

## Web / mobile

- Web `apps/web/src/dpr/*` types/API/status actions updated for new statuses and verify/approve/lock.
- Mobile offline enqueue requires `siteId` (+ optional `shift`).
- Do **not** edit `routeRegistry.ts` / `permissionCatalog.ts` / `routeElements.tsx` for this wave unless UI pages need new action buttons wired to existing DPR detail screens.
