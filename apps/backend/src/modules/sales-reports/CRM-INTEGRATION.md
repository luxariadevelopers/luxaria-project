# Sales Reports — CRM Integration (Phase 7)

**Do not edit in this wave (document only):** `app.module.ts`.

## Backend registration

```ts
import { SalesReportsModule } from './modules/sales-reports';

@Module({
  imports: [SalesReportsModule],
})
export class AppModule {}
```

## Routes

All routes require `sales_report.view`. Optional query: `projectId`, `from`, `to`, `page` (default 1), `limit` (default 50).

| Method | Path |
|--------|------|
| GET | `/sales/reports/lead-register` |
| GET | `/sales/reports/sales-funnel` |
| GET | `/sales/reports/unit-availability` |
| GET | `/sales/reports/booking-register` |
| GET | `/sales/reports/cancellation-register` |
| GET | `/sales/reports/demand-register` |
| GET | `/sales/reports/collection-register` |
| GET | `/sales/reports/outstanding` |
| GET | `/sales/reports/loan-status` |
| GET | `/sales/reports/registration-register` |
| GET | `/sales/reports/handover-register` |
| GET | `/sales/reports/warranty-register` |

## Data sources

| Report | Primary collection |
|--------|-------------------|
| Lead register | `leads` |
| Sales funnel | `leads` (aggregate) |
| Unit availability | `units` (aggregate) |
| Booking register | `bookings` |
| Cancellation register | `bookings` (cancelled) + `booking_cancellations` |
| Demand register | `payment_demands` |
| Collection register | `customer_receipts` |
| Outstanding | `payment_demands` (issued, balance > 0) |
| Loan status | `customer_loans` |
| Registration register | `unit_registrations` |
| Handover register | `unit_handovers` |
| Warranty register | `customer_warranties` |
