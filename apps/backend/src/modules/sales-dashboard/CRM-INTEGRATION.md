# Sales Dashboard — CRM Integration (Phase 7)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Permissions

| Permission | Usage |
|------------|--------|
| `sales_report.view` | Sales dashboard KPIs and reports |

Permissions already exist in `permissions.catalog.ts` and role seeds.

## Backend registration

```ts
// app.module.ts
import { SalesDashboardModule } from './modules/sales-dashboard';

@Module({
  imports: [
    // ...
    SalesDashboardModule,
  ],
})
export class AppModule {}
```

## Routes

| Method | Path | Permission |
|--------|------|------------|
| GET | `/sales/dashboard` | `sales_report.view` |

Optional query: `projectId`, `companyId`.

## KPI sources

| KPI | Collection | Notes |
|-----|------------|-------|
| Leads | `leads` | Total + counts by `status` |
| Conversions | `leads` | `status = won` OR `convertedCustomerId` set |
| Reservations | `bookings` | `hold`, `reserved`, `pending_approval` |
| Bookings | `bookings` | `booked`, `agreement`, `registered` |
| Sales value | `bookings` | Sum `approvedPrice` for booked statuses |
| Collection efficiency | `payment_demands`, `customer_receipts` | Demanded vs collected; posted receipts cross-check |
| Outstanding dues | `payment_demands` | Issued demands with balance remaining |
| Cancellation rate | `bookings` | `cancelled` / all bookings |

## Unit reservations (no separate module)

**Reservations are covered by the booking workflow** — statuses `hold`, `reserved`, and `pending_approval` on `bookings`. A dedicated `unit-reservations` module is intentionally omitted; use booking APIs and the dashboard `reservations` KPI instead.

## Web (future)

- Path: `/sales/dashboard`
- Client: `@/sales-dashboard/api`
