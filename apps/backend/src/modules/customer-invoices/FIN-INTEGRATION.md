# Customer Invoices — Finance Integration Checklist (Phase 8)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Purpose

AR **revenue recognition** from booking/demand collections already held as customer advance:

- **Dr** Customer Advance (`AccountCategory.CustomerAdvance`, party = customer)
- **Cr** Sales (`AccountCategory.Sales`) — `taxableAmount`
- **Cr** Output GST (`AccountCategory.OutputGst`) — `cgst + sgst + igst` when tax > 0

Uses `JournalService.create` with `post: true`, `sourceModule=customer_invoice`.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `customer_invoice.view` | List / get |
| `customer_invoice.manage` | Create, update draft, cancel |
| `customer_invoice.post` | Post revenue journal |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'customer_invoice.view',
'customer_invoice.manage',
'customer_invoice.post',
```

Suggested seeds: Finance / Accounts (view + manage + post), Sales (view), Director (all).

## Backend registration

1. **App module** — import and register:

```ts
import { CustomerInvoicesModule } from './modules/customer-invoices';

@Module({
  imports: [
    // ...
    CustomerInvoicesModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access):

```ts
'customer-invoice': {
  model: CustomerInvoice.name,
  projectField: 'projectId',
},
```

## API surface — customer-invoices

| Method | Path | Permission |
|--------|------|------------|
| POST | `/customer-invoices` | manage |
| GET | `/customer-invoices` | view |
| GET | `/customer-invoices/:id` | view |
| PATCH | `/customer-invoices/:id` | manage |
| POST | `/customer-invoices/:id/post` | **post** |
| POST | `/customer-invoices/:id/cancel` | manage |

### Workflow

`draft → posted`  
Cancel: `draft → cancelled`

### Links (optional on create)

- `bookingId`, `customerId`, `unitId`
- `demandId`, `paymentScheduleId` — tie-back to payment schedule / demand
- `gstDocumentId` — reserved for GST e-invoice module

### Posting pattern

Account resolution follows `customer-receipts` `requireAccountByCategory` (active + `allowManualPosting`).

## Module path

```
apps/backend/src/modules/customer-invoices/
```

## Out of scope (later)

- Auto-create from payment demand issue
- GST e-invoice / `gstDocumentId` generation
- Posted invoice reversal / credit note
- PDF tax invoice template
