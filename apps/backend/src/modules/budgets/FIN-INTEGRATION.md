# Budgets — Finance Integration Checklist (Phase 8)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `budget.view` | List / get budgets |
| `budget.manage` | Create, update, submit, revise, cancel |
| `budget.approve` | Approve / reject pending budgets |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'budget.view',
'budget.manage',
'budget.approve',
```

Suggested seeds: Finance / QS (view + manage), Director / Finance lead (view + manage + approve), PM (view).

## Backend registration

1. **App module** — import and register:

```ts
import { BudgetsModule } from './modules/budgets';

@Module({
  imports: [
    // ...
    BudgetsModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access) — optional `projectId`; company-level budgets use `projectId: null`:

```ts
'budget': {
  model: Budget.name,
  projectField: 'projectId',
},
```

## API surface — budgets

| Method | Path | Permission |
|--------|------|------------|
| POST | `/budgets` | manage |
| GET | `/budgets` | view |
| GET | `/budgets/:id` | view |
| PATCH | `/budgets/:id` | manage |
| POST | `/budgets/:id/submit` | manage |
| POST | `/budgets/:id/approve` | **approve** |
| POST | `/budgets/:id/reject` | **approve** |
| POST | `/budgets/:id/revise` | manage |
| POST | `/budgets/:id/cancel` | manage |

### Workflow

`draft → pending_approval → approved`  
Revise: `approved → superseded` (+ new draft version with `version + 1`)  
Reject: `pending_approval → draft` (stores `rejectionReason`)  
Cancel: `draft|pending_approval → cancelled`

### Versioning

- v1 sets `rootBudgetId` to self after create.
- `revise` copies lines (or accepts overrides), links `revisedFromId`, increments `version`.

### Helper — commitment checks

```ts
BudgetsService.getApprovedBudgetAmount(accountId, projectId?, financialYearId, costCentreId?)
```

Sums line amounts from the **latest approved version** per `rootBudgetId` chain.

## Module path

```
apps/backend/src/modules/budgets/
```

## Out of scope (later)

- Budget vs actual variance reports
- Approvals-engine document wiring
- Auto-block PO/commitments when over budget
