# Contractor Reports — Integration (W9)

See consolidated notes in `docs/audit/contractor/CTR-INTEGRATION.md`.

## Quick register

```ts
// app.module.ts
import { ContractorReportsModule } from './modules/contractor-reports/contractor-reports.module';
// imports: ContractorReportsModule
```

## Routes (all `contractor_report.view`)

| Path |
|------|
| `GET /contractor/reports/contractors` |
| `GET /contractor/reports/work-orders` |
| `GET /contractor/reports/ra-register` |
| `GET /contractor/reports/retention` |
| `GET /contractor/reports/recoveries` |
| `GET /contractor/reports/status` |

## Web

- Path: `/contractors/reports`
- Page: `ContractorReportsPage`
- Route id: `contractor-reports`
- Client: `@/contractor-reports/api`
