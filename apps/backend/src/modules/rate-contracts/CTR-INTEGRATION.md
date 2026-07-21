# Rate Contracts — Integration Checklist (Phase 6 / W3)

**Role:** Schedule-of-rates instrument (BOQ / labour / material-inclusive / equipment rates + commercial terms). Distinct from `contractor-agreements`, which remain the project-bound commercial commitment (work scope, manpower, billing cycle, advance disbursement).

## Relationship to contractor-agreements / work orders

| Instrument | Module | Responsibility |
|------------|--------|----------------|
| **Rate contract** | `rate-contracts` (**this**) | Approved rate schedule (company-wide or project). Versioned; activate / supersede. |
| **Contractor agreement** | `contractor-agreements` | Project commercial commitment that *consumes* an active rate contract (or continues embedding line rates until W4 wires `rateContractId`). |
| **Work order** | `work-orders` (W4) | Issues against an agreement; bills resolve rates from the WO commercial snapshot, which should copy from the linked rate-contract revision at issue/amend time. |

```
Rate Contract (SOR, vN active)
        │  reference + rate snapshot
        ▼
Contractor Agreement (project commitment)
        │
        ▼
Work Order (+ amendments) → MB / RA bills
```

**Do not** silently overwrite active rate lines. Amendments = `supersede` → new draft version → `activate` (prior becomes `superseded`).

Permissions used (add to RBAC catalog + role seeds when wiring):

| Permission | Usage |
|------------|--------|
| `rate_contract.view` | List / get / by-contractor / by-project |
| `rate_contract.manage` | Create, update, supersede, terminate, delete draft |
| `rate_contract.approve` | Activate draft |

## Backend registration

1. **App module** — import and register:

```ts
import { RateContractsModule } from './modules/rate-contracts';

@Module({
  imports: [
    // ...
    RateContractsModule,
  ],
})
export class AppModule {}
```

2. **RBAC** — `apps/backend/src/modules/rbac/permissions.catalog.ts`:

```ts
'rate_contract.view',
'rate_contract.manage',
'rate_contract.approve',
```

Seed onto QS / Commercial (view + manage), PM / Director (view + approve), Site Engineer (view) as appropriate.

3. **Optional ownership registry** — if project-scoped routes need R-003 resource lookup, register `rate-contract` in `resource-ownership.registry.ts` with `projectId` (nullable for company scope → treat as global).

4. **Downstream consumers (later waves):**
   - `contractor-agreements`: optional `rateContractId` + snapshot of rates at approve/amend.
   - `work-orders`: resolve billable rates from WO revision snapshot sourced from rate contract (+ agreement overrides).

## Web registration

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx`):

```tsx
{ path: 'rate-contracts', element: <RateContractsPage /> }
```

2. Navigation — under Contractor / Commercial, label **Rate Contracts**, permission `rate_contract.view`.

3. Page + API already live at:

- `apps/web/src/rate-contracts/api.ts`
- `apps/web/src/rate-contracts/RateContractsPage.tsx`

## API surface

| Method | Path | Permission |
|--------|------|------------|
| POST | `/rate-contracts` | manage |
| GET | `/rate-contracts` | view |
| GET | `/rate-contracts/by-contractor/:contractorId` | view |
| GET | `/rate-contracts/by-project/:projectId` | view |
| GET | `/rate-contracts/:id` | view |
| PATCH | `/rate-contracts/:id` | manage |
| POST | `/rate-contracts/:id/activate` | approve |
| POST | `/rate-contracts/:id/supersede` | manage |
| POST | `/rate-contracts/:id/terminate` | manage |
| DELETE | `/rate-contracts/:id` | manage (draft only) |

### Scope rules

- `scope=company` → `projectId` must be `null` (company-wide SOR).
- `scope=project` → `projectId` required.

### Status workflow

`draft` → `active` (activate) → `superseded` | `terminated` | `expired`

`supersede` on an **active** row creates `version+1` **draft**; prior stays active until the new draft is activated.
