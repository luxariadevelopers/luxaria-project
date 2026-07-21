# Site Execution Dashboard — Integration (W9)

See consolidated notes in `docs/audit/site-execution/SE-INTEGRATION.md` (section **SE Wave W9**).

## Quick register

```ts
// app.module.ts
import { SiteExecutionDashboardModule } from './modules/site-execution-dashboard/site-execution-dashboard.module';
// imports: SiteExecutionDashboardModule
```

## Routes

- `GET /site-execution/dashboard/pm?projectId=` — `dashboard.view`
- `GET /site-execution/dashboard/director?projectId=` — `dashboard.view`

## Web

- Path: `/site-execution/dashboard`
- Page: `SiteExecutionDashboardPage`
- Route id: `site-execution-dashboard`
- Client: `@/site-execution-dashboard/api`
