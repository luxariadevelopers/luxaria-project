# Site Execution Reports — Integration (W9)

See consolidated notes in `docs/audit/site-execution/SE-INTEGRATION.md` (section **SE Wave W9**).

## Quick register

```ts
// app.module.ts
import { SiteExecutionReportsModule } from './modules/site-execution-reports/site-execution-reports.module';
// imports: SiteExecutionReportsModule
```

## Routes (all `dashboard.view`)

| Path |
|------|
| `GET /site-execution/reports/dpr-register` |
| `GET /site-execution/reports/labour` |
| `GET /site-execution/reports/equipment-utilization` |
| `GET /site-execution/reports/material-consumption` |
| `GET /site-execution/reports/daily-progress` |
| `GET /site-execution/reports/delay` |
| `GET /site-execution/reports/quality` |
| `GET /site-execution/reports/safety` |
| `GET /site-execution/reports/productivity` |

## Web

- Path: `/site-execution/reports`
- Page: `SiteExecutionReportsPage`
- Route id: `site-execution-reports`
- Client: `@/site-execution-reports/api`
