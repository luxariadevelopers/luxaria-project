# Contractor Management — Integration Notes (Phase 6 W1 + W9 partial)

**Status:** Modules + pages implemented; **not** wired into locked registration files (parent step).  
**Do not edit in this wave:** `app.module.ts`, `permissions.catalog.ts`, `role.seed.ts`, web `routeRegistry` / nav.

---

## Parent must register

### 1. Backend `app.module.ts`

```ts
import { ContractorDashboardModule } from './modules/contractor-dashboard/contractor-dashboard.module';
import { ContractorReportsModule } from './modules/contractor-reports/contractor-reports.module';

// imports: [ ..., ContractorDashboardModule, ContractorReportsModule ]
// ContractorsModule already registered — no change needed for W1 schema extensions
```

### 2. Permissions (`permissions.catalog.ts` + `role.seed.ts`)

| Permission | Use |
|------------|-----|
| `contractor_report.view` | **Add** — all `/contractor/reports/*` |
| `contractor.view` | Reuse — compliance expiring, master |
| `contractor.manage` | Reuse — suspend / blacklist / reactivate / doc verify |
| `dashboard.view` | Reuse — `/contractor/dashboard` |

Suggested seeds: Director, Finance, PM get `contractor_report.view` + `dashboard.view`.

### 3. Web — `routeRegistry.ts`

```ts
{
  id: 'contractor-dashboard',
  path: '/contractors/dashboard',
  title: 'Contractor Dashboard',
  layout: 'app',
  showInNav: true,
  groupId: 'dashboard',
  icon: 'dashboard',
  anyOf: ['dashboard.view', 'contractor.view'],
  projectScope: 'optional',
  breadcrumbSegment: 'contractors',
},
{
  id: 'contractor-reports',
  path: '/contractors/reports',
  title: 'Contractor Reports',
  layout: 'app',
  showInNav: true,
  groupId: 'reports',
  icon: 'reports',
  anyOf: ['contractor_report.view', 'contractor.view'],
  projectScope: 'optional',
  breadcrumbSegment: 'contractors',
},
{
  id: 'contractor-compliance',
  path: '/contractors/compliance',
  title: 'Contractor Compliance',
  layout: 'app',
  showInNav: true,
  groupId: 'project-control', // or contractors
  icon: 'compliance',
  anyOf: ['contractor.view'],
  projectScope: 'none',
  breadcrumbSegment: 'contractors',
},
```

### 4. Web — `routeElements.tsx`

```ts
import { ContractorDashboardPage } from '@/pages/ContractorDashboardPage';
import { ContractorReportsPage } from '@/pages/ContractorReportsPage';
import { ContractorCompliancePage } from '@/pages/ContractorCompliancePage';

'contractor-dashboard': <ContractorDashboardPage />,
'contractor-reports': <ContractorReportsPage />,
'contractor-compliance': <ContractorCompliancePage />,
```

---

## API surface

### W1 — Contractor master extensions (`ContractorsModule`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/contractors/compliance/expiring?withinDays=` | `contractor.view` |
| POST | `/contractors/:id/suspend` | `contractor.manage` |
| POST | `/contractors/:id/block` | `contractor.manage` (blacklist; reason required) |
| POST | `/contractors/:id/reactivate` | `contractor.manage` |
| POST | `/contractors/:id/deactivate` | `contractor.manage` |
| POST | `/contractors/:id/documents/:docId/verify` | `contractor.manage` |

Create/update accept `contacts[]`, `addresses[]`, `insurance`, `workCategories` (trades).

Status transitions append `statusEvents[]` and write `audit_logs` (`module: contractor`).

### W9 — Dashboard + reports

| Method | Path | Permission |
|--------|------|------------|
| GET | `/contractor/dashboard` | `dashboard.view` |
| GET | `/contractor/reports/contractors` | `contractor_report.view` |
| GET | `/contractor/reports/work-orders` | `contractor_report.view` |
| GET | `/contractor/reports/ra-register` | `contractor_report.view` |
| GET | `/contractor/reports/retention` | `contractor_report.view` |
| GET | `/contractor/reports/recoveries` | `contractor_report.view` |
| GET | `/contractor/reports/status` | `contractor_report.view` |

Optional query: `projectId`, `companyId`, `from`, `to`, `limit`, `withinDays` (dashboard).

---

## Graceful optional collections

| Collection | KPI / report | Missing behaviour |
|------------|--------------|-------------------|
| `work_orders` | Open WOs, WO summary | `available: false`, count/rows empty |
| `contractor_bills` | Pending bills, retention, payable, RA/recoveries | zeros / empty |
| `contractor_retentions` | Retention register | Fallback to posted RA `retention` |
| `contractor_recoveries` | Recoveries register | Fallback to RA deduction lines |

---

## Files created / extended

```
apps/backend/src/modules/contractors/          # W1 extend
apps/backend/src/modules/contractor-dashboard/
apps/backend/src/modules/contractor-reports/
apps/web/src/contractor-dashboard/api.ts
apps/web/src/contractor-reports/api.ts
apps/web/src/contractors/complianceApi.ts
apps/web/src/pages/ContractorDashboardPage.tsx
apps/web/src/pages/ContractorReportsPage.tsx
apps/web/src/pages/ContractorCompliancePage.tsx
apps/mobile/src/contractors/README.md          # deferral notes
apps/mobile/src/work-measurement/api.ts       # acknowledgeWorkMeasurement
docs/audit/contractor/CTR-INTEGRATION.md
docs/audit/contractor/CTR-completion-report.md
```

---

## Mobile

- Measurement ack client: `acknowledgeWorkMeasurement` (online verify).
- Work-order list / offline WO progress: **deferred** until W4 (`apps/mobile/src/contractors/README.md`).
