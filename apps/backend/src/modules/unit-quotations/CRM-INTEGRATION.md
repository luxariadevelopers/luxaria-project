# Unit Sales Quotations — CRM Integration Checklist

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Purpose

Versioned residential/commercial **unit sales quotations** with full price breakup (base, PLC, floor rise, taxes, discounts). Reuses existing procurement quotation permissions (`quotation.view` / `quotation.manage`) until CRM-specific keys are added.

## Permissions (already in catalog)

| Permission | Usage |
|------------|--------|
| `quotation.view` | List / get |
| `quotation.manage` | Create, update, issue, accept, reject, revise, convert |

Suggested CRM role seeds: Sales Executive (view + manage), Sales Manager (view + manage), Director (view).

## Backend registration

1. **App module** — import and register:

```ts
import { UnitQuotationsModule } from './modules/unit-quotations';

@Module({
  imports: [
    // ...
    UnitQuotationsModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access) — register for `:id` routes:

```ts
// resource-ownership.registry.ts (illustrative)
'unit-quotation': {
  model: UnitQuotation.name,
  projectField: 'projectId',
},
```

Until registered, list filters (`projectId` query) remain the primary scope guard via `@ProjectScoped`.

## API surface — `unit-quotations`

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/unit-quotations` | manage | Draft; seeds `basePrice` from `Unit.basePrice` |
| GET | `/unit-quotations` | view | Filters: projectId, unitId, leadId, customerId, status, page, limit |
| GET | `/unit-quotations/:id` | view | |
| PATCH | `/unit-quotations/:id` | manage | Draft only |
| POST | `/unit-quotations/:id/issue` | manage | Soft unit availability check (available / held) |
| POST | `/unit-quotations/:id/accept` | manage | Issued → accepted |
| POST | `/unit-quotations/:id/reject` | manage | Body `{ reason? }` |
| POST | `/unit-quotations/:id/revise` | manage | Supersedes source; new draft version |
| POST | `/unit-quotations/:id/convert-to-booking` | manage | Requires `bookingId` or `reservationId` (stub) |

### Workflow

`draft → issued → accepted | rejected | expired`  
`issued | accepted | rejected → superseded` (via revise → new draft chain)  
`accepted → converted` (via convert-to-booking)

### Pricing / totals

Collection: `unit_quotations`.

Totals recomputed on every save (schema pre-save + service):

```
grandTotal =
  basePrice + plc + floorRise + carPark + clubHouse + corpusFund
  + registrationEstimate + gst + stampDutyEstimate + otherCharges
  − discount − offerAmount
```

All amounts rounded to 2 decimals.

### Versioning

- `version` starts at 1; increments on revise.
- `rootQuotationId` — first version in chain (self on create).
- `revisedFromId` — prior version when revised.

## Related modules (future wiring)

| Module | Integration |
|--------|-------------|
| `units` | Base price seed; soft availability on issue |
| `bookings` | Auto-create booking on convert (currently stub — pass `bookingId`) |
| `customers` / leads CRM | Optional `customerId` / `leadId` links |
| `projects` | `companyId` denormalized from project |

## Web registration (when allowed)

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx`):

```tsx
import { UnitQuotationsPage } from '@/pages/UnitQuotationsPage';

// ...
'unit-quotations': <UnitQuotationsPage />,
```

2. Navigation — under Sales / CRM:

| Path | Label | Permission |
|------|--------|------------|
| `/unit-quotations` | Unit Quotations | `quotation.view` |

## Module path

```
apps/backend/src/modules/unit-quotations/
```

## Out of scope (later)

- PDF quotation document generation
- Attachment upload endpoint
- Expiry scheduler (`validUntil` → expired)
- Auto booking/reservation creation on convert
- Dedicated `sales_quotation.*` permissions
