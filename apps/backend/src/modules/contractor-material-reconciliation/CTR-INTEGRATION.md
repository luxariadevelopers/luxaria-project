# Contractor Recoveries + Material Reconciliation — Integration (Phase 6 / W7)

First-class recoveries and material reconciliation. Feeds running-bill deductions
(`materialRecovery`, advances, penalties, TDS, etc.) per CTR-architecture.

**Permissions** (add to RBAC catalog + role seeds when wiring — do not skip):

| Permission | Usage |
|------------|--------|
| `contractor_recovery.view` | List / get recoveries and material reconciliations |
| `contractor_recovery.manage` | Create, update, approve, post |

Suggested seed: QS / Finance / PM (`manage`), Site Engineer (`view`), Director (`view`).

## Formula

```
Issued − Theoretical − ApprovedWastage − Returned = RecoverableDifference
recoveryAmount = max(0, RecoverableDifference) × unitRate
```

On approve with `recoveryAmount > 0`, a `ContractorRecovery` of type `material`
is created (status `approved`) and linked via `recoveryId`.

## Backend registration

1. **App module** — import and register both modules:

```ts
import { ContractorRecoveriesModule } from './modules/contractor-recoveries';
import { MaterialReconciliationModule } from './modules/contractor-material-reconciliation';

@Module({
  imports: [
    // ...
    ContractorRecoveriesModule,
    MaterialReconciliationModule,
  ],
})
export class AppModule {}
```

2. **RBAC** — `apps/backend/src/modules/rbac/permissions.catalog.ts`:

```ts
'contractor_recovery.view',
'contractor_recovery.manage',
```

3. **Project access** — `resource-ownership.registry.ts`:

```ts
'contractor-recovery': {
  modelName: 'ContractorRecovery',
  projectIdField: 'projectId',
  companyIdField: null,
},
'contractor-material-reconciliation': {
  modelName: 'ContractorMaterialReconciliation',
  projectIdField: 'projectId',
  companyIdField: null,
},
```

4. **RA bill hook (later / W6 align)** — when posting reconciliation to bill,
   add `recoveryAmount` into `ContractorBill.materialRecovery` (or line-level
   recoveries) instead of manual entry only.

## Web registration

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx`):

```tsx
import { MaterialReconciliationPage } from '@/contractor-material-reconciliation';

{ path: 'material-reconciliation', element: <MaterialReconciliationPage /> }
```

2. Navigation — under Contractors / Commercial, label **Material Reconciliation**,
   permission `contractor_recovery.view`.

3. Pages + APIs already live at:

- `apps/web/src/contractor-material-reconciliation/api.ts`
- `apps/web/src/contractor-material-reconciliation/MaterialReconciliationPage.tsx`
- `apps/web/src/contractor-recoveries/api.ts`

## API surface

### Material reconciliations (`/contractor-material-reconciliations`)

| Method | Path | Permission |
|--------|------|------------|
| POST | `/` | manage |
| GET | `/` | view |
| GET | `/:id` | view |
| PATCH | `/:id` | manage |
| POST | `/:id/approve` | manage |
| POST | `/:id/post-to-bill` | manage |

Status: `draft` → `approved` → `posted_to_bill`

### Recoveries (`/contractor-recoveries`)

| Method | Path | Permission |
|--------|------|------------|
| POST | `/` | manage |
| GET | `/` | view |
| GET | `/:id` | view |
| PATCH | `/:id` | manage |
| POST | `/:id/approve` | manage |
| POST | `/:id/post` | manage |

Types: `mobilization_advance` · `secured_advance` · `retention` · `security_deposit` ·
`material` · `equipment` · `electricity_water` · `labour_welfare` · `damage` ·
`penalty` · `tds` · `gst_tds` · `manual`

Status: `draft` → `approved` → `posted`  
Optional `billId`; approval + post audit fields (`approvedBy/At`, `postedBy/At`).

## Upstream data (Phase 4 / 5)

- Issued / returned → `material-issues` (`issueTo: contractor`)
- Theoretical / wastage → `material-consumption` standards / BOQ coefficients
- This module stores period snapshots; auto-aggregation from stock+DPR can follow
