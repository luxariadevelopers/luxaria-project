# Contractor Dashboard — Integration (W9)

See consolidated notes in `docs/audit/contractor/CTR-INTEGRATION.md`.

## Quick register

```ts
// app.module.ts
import { ContractorDashboardModule } from './modules/contractor-dashboard/contractor-dashboard.module';
// imports: ContractorDashboardModule
```

## Routes

- `GET /contractor/dashboard` — `dashboard.view`

## Web

- Path: `/contractors/dashboard`
- Page: `ContractorDashboardPage`
- Route id: `contractor-dashboard`
- Client: `@/contractor-dashboard/api`
