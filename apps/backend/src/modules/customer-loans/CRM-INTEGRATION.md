# Customer Loans — CRM Integration Checklist

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `loan.view` | List / get customer loans |
| `loan.manage` | Create, update, transition, disbursements, correspondence, documents |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'loan.view',
'loan.manage',
```

Suggested seeds: Sales / CRM (view + manage), Finance (view), Director (view).

## Backend registration

1. **App module** — import and register:

```ts
import { CustomerLoansModule } from './modules/customer-loans';

@Module({
  imports: [
    // ...
    CustomerLoansModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access):

```ts
'customer-loan': {
  model: CustomerLoan.name,
  projectField: 'projectId',
},
```

## API surface — customer-loans

| Method | Path | Permission |
|--------|------|------------|
| POST | `/customer-loans` | manage |
| GET | `/customer-loans` | view |
| GET | `/customer-loans/:id` | view |
| PATCH | `/customer-loans/:id` | manage |
| POST | `/customer-loans/:id/transition` | manage |
| POST | `/customer-loans/:id/add-disbursement` | manage |
| POST | `/customer-loans/:id/add-correspondence` | manage |
| PATCH | `/customer-loans/:id/pending-documents/:documentId` | manage |

### Workflow

`draft → applied → sanctioned → disbursing → closed`  
Also: `applied → rejected`, `draft|applied|sanctioned|disbursing → cancelled`

### Computed fields

- `totalDisbursed` — sum of `disbursements[].amount` (mapper)

## Module path

```
apps/backend/src/modules/customer-loans/
```

## Out of scope (later)

- Bank API integration for disbursement sync
- Auto-link to customer receipts (bank_loan source)
- Document upload service wiring for sanction letters
