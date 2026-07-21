# Contractor Retention + Ledger — Integration Checklist (Phase 6 / W8)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## How retention is held today (baseline)

On **posted** RA bills (`contractor-bills`):

1. Agreement `retentionPercentage` (or override) → bill field `retention`.
2. Posting credits **Retention Payable** (party = contractor) and reduces net payable.
3. There is **no** staged release / register — only withhold on the bill/journal.

W8 adds `contractor-retention` for deduction records, ceiling, staged release, approval, and a contractor-wise register. Ledger UI remains the immutable journal party ledger.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `contractor_retention.view` | List / get / register |
| `contractor_retention.manage` | Create, update, submit, approve, reject, cancel |
| `contractor_retention.release` | Finalise approved release (`practical_completion` / `defect_liability` / `bg_replacement`) |

Ledger page reuses existing `report.view` (same as accounting-reports).

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'contractor_retention.view',
'contractor_retention.manage',
'contractor_retention.release',
```

Suggested seeds: Finance / QS (view + manage), Director / Finance lead (view + manage + release), PM (view).

## Backend registration

1. **App module** — import and register:

```ts
import { ContractorRetentionModule } from './modules/contractor-retention';
import { ContractorLedgerModule } from './modules/contractor-ledger';

@Module({
  imports: [
    // ...
    ContractorRetentionModule,
    ContractorLedgerModule, // optional thin wrapper; web can also call accounting-reports
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access) — when wiring `@ProjectScoped` resource lookups for `:id` routes, register:

```ts
// resource-ownership.registry.ts (illustrative)
'contractor-retention': {
  model: ContractorRetention.name,
  projectField: 'projectId',
},
```

Until registered, keep list/register project filters (`projectId` query) as the primary scope.

## API surface — contractor-retention

| Method | Path | Permission |
|--------|------|------------|
| POST | `/contractor-retention` | manage |
| GET | `/contractor-retention/register` | view |
| GET | `/contractor-retention` | view |
| GET | `/contractor-retention/:id` | view |
| PATCH | `/contractor-retention/:id` | manage |
| POST | `/contractor-retention/:id/submit` | manage |
| POST | `/contractor-retention/:id/approve` | manage |
| POST | `/contractor-retention/:id/reject` | manage |
| POST | `/contractor-retention/:id/release` | **release** |
| POST | `/contractor-retention/:id/cancel` | manage |

### Records

- **Deduction** — links `billId` (posted/paid RA); amount ≤ bill.retention; enforces `ceilingAmount` across held balance.
- **Release** — requires `releaseStage`; `bg_replacement` requires `bgReference`; amount ≤ available held (approved deductions − released − in-flight releases).

### Workflow

`draft → pending_approval → approved`  
Release only: `approved → released` (via `contractor_retention.release`)  
Also: `pending_approval → rejected`, `draft|pending_approval|rejected → cancelled`

### Register

`GET /contractor-retention/register?projectId=&contractorId=&agreementId=`  
Contractor-wise: ceiling, totalDeducted, totalReleased, balanceHeld, counts.

## API surface — contractor-ledger (thin wrapper)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/contractor-ledger` | `report.view` |

Delegates to `AccountingReportsService.getReport('contractor-ledger', …)`.  
Equivalent: `GET /accounting-reports/contractor-ledger`.

## Web registration

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx`):

```tsx
import { ContractorLedgerPage } from '@/pages/ContractorLedgerPage';
import { RetentionRegisterPage } from '@/pages/RetentionRegisterPage';

// ...
'contractor-ledger': <ContractorLedgerPage />,
'retention-register': <RetentionRegisterPage />,
```

2. Navigation / `routeRegistry` (when allowed) — under Contractors / Finance:

| Path | Label | Permission |
|------|--------|------------|
| `/retention-register` | Retention Register | `contractor_retention.view` |
| `/contractor-ledger` | Contractor Ledger | `report.view` |

3. Pages + clients already present:

- `apps/web/src/pages/RetentionRegisterPage.tsx`
- `apps/web/src/pages/ContractorLedgerPage.tsx`
- `apps/web/src/contractor-retention/api.ts`
- `apps/web/src/contractor-ledger/api.ts` (tries `/contractor-ledger`, falls back to accounting-reports)

## Module paths

```
apps/backend/src/modules/contractor-retention/
apps/backend/src/modules/contractor-ledger/
```

## Out of scope (later)

- Auto-create deduction rows on bill post
- Journal reverse / release posting into Retention Payable
- Approvals-engine document wiring for retention release
