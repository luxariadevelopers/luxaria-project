# Site Execution — Parent Integration Notes

**Status:** W1–W9 modules registered (app.module, RBAC, web routes). See `SE-completion-report.md`.

## Deploy — DPR index migration (W1) — **required before Phase 6**

**Do not** use `dailyprogressreports` or a `companyId`-keyed unique index. Match the Phase 5 schema:

- Collection: `daily_progress_reports`
- Unique: `uniq_dpr_project_site_date_shift` on `{ projectId, siteId, reportDate, shift }` (partial)

Controlled migration (preferred):

```bash
MONGODB_URI=... node scripts/migrations/se-dpr-site-shift-unique-index.mjs --dry-run
MONGODB_URI=... node scripts/migrations/se-dpr-site-shift-unique-index.mjs --apply
```

Playbook: `docs/audit/site-execution/SE-dpr-index-migration.md`.

---

# SE Wave W5 — Integration Notes (Site Issues + Site Diary + Photos)

**Wave:** W5 — Site issues + diary + photo geo metadata  
**Status:** Modules implemented; **not** wired into `app.module.ts` / permission catalog / web routes (parent step).

## Parent must register

### 1. Backend `app.module.ts`

Import and add:

```ts
import { SiteIssuesModule } from './modules/site-issues';
import { SiteDiaryModule } from './modules/site-diary';
import { SitePhotosModule } from './modules/site-photos';

// imports: [ ..., SiteIssuesModule, SiteDiaryModule, SitePhotosModule ]
```

### 2. Permissions catalog + role seed

Add to `permissions.catalog.ts` (and seed onto SITE_ENGINEER / PM / Director as appropriate):

| Permission | Module |
|------------|--------|
| `site_issue.view` | List / get issues |
| `site_issue.create` | Create + update open/assigned |
| `site_issue.assign` | Assign + resolve |
| `site_issue.close` | Close resolved issues |
| `site_diary.view` | List / get diary |
| `site_diary.manage` | Create / update / delete diary |

Site photos reuse existing:

| Permission | Usage |
|------------|--------|
| `document.upload` | `POST /site-photos`, `DELETE /site-photos/:id` |
| `document.view` | List / get photo metadata |
| `document.*` | Binary upload via existing `/documents` APIs |

### 3. Web routes (`routeRegistry` / `routeElements`)

| Path (suggested) | Page | Permission |
|------------------|------|------------|
| `/project-control/site-issues` | `SiteIssuesPage` | `site_issue.view` |
| `/project-control/site-diary` | `SiteDiaryPage` | `site_diary.view` |

Files ready (not registered):

- `apps/web/src/pages/SiteIssuesPage.tsx`
- `apps/web/src/pages/SiteDiaryPage.tsx`
- `apps/web/src/site-issues/api.ts`
- `apps/web/src/site-diary/api.ts`

### 4. Resource ownership (done in this wave)

`resource-ownership.registry.ts` already includes:

- `site-issue` → `SiteIssue`
- `site-diary` → `SiteDiaryEntry`
- `site-photo` → `SitePhoto`

## API surface

### Site Issues — `/site-issues`

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/` | `site_issue.create` | Status `open`; issueNumber `ISS-YYYY-######` |
| GET | `/` | `site_issue.view` | Filter: projectId, siteId, dprId, status, type, severity |
| GET | `/:id` | `site_issue.view` | |
| PATCH | `/:id` | `site_issue.create` | Open/assigned only |
| POST | `/:id/assign` | `site_issue.assign` | Body `{ assigneeUserId }` → `assigned` |
| POST | `/:id/resolve` | `site_issue.assign` | → `resolved` + `resolvedAt` |
| POST | `/:id/close` | `site_issue.close` | Resolved only → `closed` + `closedAt` |

Schema: `projectId`, `siteId?`, `dprId?`, `type` (`delay|material_shortage|labour_shortage|equipment_failure|design_clarification|other`), `title`, `description`, `status`, `assigneeUserId?`, `severity`, `resolvedAt`, `closedAt`, `photoDocumentIds[]`, audit via base plugins.

### Site Diary — `/site-diary`

| Method | Path | Permission |
|--------|------|------------|
| POST | `/` | `site_diary.manage` |
| GET | `/` | `site_diary.view` |
| GET | `/:id` | `site_diary.view` |
| PATCH | `/:id` | `site_diary.manage` |
| DELETE | `/:id` | `site_diary.manage` (soft delete) |

List filters: `projectId`, `siteId`, `dprId`, `entryDate`, `fromDate`, `toDate`, `entryType`.

`entryType`: `meeting|delay|visitor|instruction|risk|other`. Optional `visitors[]`, `photoDocumentIds[]`.

### Site Photos — `/site-photos` (thin metadata)

Binary stays in `documents`. This module stores geo + link metadata only.

| Method | Path | Permission |
|--------|------|------------|
| POST | `/` | `document.upload` |
| GET | `/` | `document.view` |
| GET | `/:id` | `document.view` |
| DELETE | `/:id` | `document.upload` |

Attach body: `projectId`, `siteId?`, `documentId`, `linkType` (`dpr|work|issue|quality|safety|diary`), `linkId`, `lat?`, `lng?`, `capturedAt?`, `version?`, `caption?`.

Flow: `POST /documents/presign-upload` → PUT S3 → confirm → `POST /site-photos` → optionally push `documentId` into issue/diary `photoDocumentIds`.

## Security

- Controllers: `@ProjectScoped({ mode: 'filter', resource: { … }, operation: 'read' })`
- Services call `SiteAccessService.assertSiteAccessIfScoped` when `siteId` is present
- No changes to IAM / R-003 patterns

## Module paths

```
apps/backend/src/modules/site-issues/
apps/backend/src/modules/site-diary/
apps/backend/src/modules/site-photos/
```

Each exports `index.ts` + has `*.service.spec.ts` smoke tests.

## Optional follow-ups (not this wave)

- Wire DPR `issueIds` / `diaryEntryIds` / `photoDocumentIds` on approve
- Add `SITE_ISSUE` to `NumberEntityType` if formal numbering formats are required
- Nav menu entries under Project Control

---

# SE Wave W9 — Site Execution Dashboard + Reports

**Wave:** W9 — PM/Director dashboards + SE report suite  
**Status:** Modules + pages implemented; **not** wired into locked registration files (parent step).

## Parent must register

### 1. Backend `app.module.ts`

```ts
import { SiteExecutionDashboardModule } from './modules/site-execution-dashboard/site-execution-dashboard.module';
import { SiteExecutionReportsModule } from './modules/site-execution-reports/site-execution-reports.module';

// imports: [ ..., SiteExecutionDashboardModule, SiteExecutionReportsModule ]
```

### 2. Permissions

Reuse existing `dashboard.view` only (already in catalog + Director / PM seeds).  
No new permissions for W9.

### 3. Web — `routeRegistry.ts`

```ts
{
  id: 'site-execution-dashboard',
  path: '/site-execution/dashboard',
  title: 'Site Execution Dashboard',
  layout: 'app',
  showInNav: true,
  groupId: 'dashboard', // or 'project-control'
  icon: 'dashboard',
  anyOf: ['dashboard.view'],
  projectScope: 'required',
  breadcrumbSegment: 'site-execution',
},
{
  id: 'site-execution-reports',
  path: '/site-execution/reports',
  title: 'Site Execution Reports',
  layout: 'app',
  showInNav: true,
  groupId: 'reports', // or 'project-control'
  icon: 'reports',
  anyOf: ['dashboard.view'],
  projectScope: 'required',
  breadcrumbSegment: 'site-execution',
},
```

### 4. Web — `routeElements.tsx`

```ts
import { SiteExecutionDashboardPage } from '@/pages/SiteExecutionDashboardPage';
import { SiteExecutionReportsPage } from '@/pages/SiteExecutionReportsPage';

// ROUTE_ELEMENTS map:
'site-execution-dashboard': <SiteExecutionDashboardPage />,
'site-execution-reports': <SiteExecutionReportsPage />,
```

## API surface (W9)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/site-execution/dashboard/pm?projectId=` | `dashboard.view` |
| GET | `/site-execution/dashboard/director?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/dpr-register?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/labour?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/equipment-utilization?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/material-consumption?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/daily-progress?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/delay?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/quality?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/safety?projectId=` | `dashboard.view` |
| GET | `/site-execution/reports/productivity?projectId=` | `dashboard.view` |

Optional query: `from`, `to` (ISO). Reports also accept `limit` (1–1000).  
All controllers: `@ProjectScoped({ mode: 'filter', operation: 'read' })`.

## Files created (W9)

```
apps/backend/src/modules/site-execution-dashboard/
apps/backend/src/modules/site-execution-reports/
apps/web/src/site-execution-dashboard/api.ts
apps/web/src/site-execution-reports/api.ts
apps/web/src/pages/SiteExecutionDashboardPage.tsx
apps/web/src/pages/SiteExecutionReportsPage.tsx
```

## Graceful optional collections

| Collection | Used for |
|------------|----------|
| `equipment_utilizations` | Equipment utilization KPI + report |
| `site_issues` | Open / critical issues, delay supplement |
| `site_quality` | Quality report |
| `site_safety` / `site_safety_events` / `hse_events` | Safety report |

Missing → zeros / empty arrays (quality/safety fall back to DPR embedded issue arrays).

## Web API clients

- `@/site-execution-dashboard/api` → `fetchSePmDashboard`, `fetchSeDirectorDashboard`
- `@/site-execution-reports/api` → `SE_REPORT_OPTIONS` + per-report fetchers
