# Customer Portal — CRM Integration (Phase 7)

**Do not edit in this wave (document only):** `app.module.ts`.

## Permissions

| Permission | Usage |
|------------|--------|
| `customer_portal.view` | Portal self-service endpoints |
| `customer_portal.manage` | Staff overview + optional `customerId` impersonation |

## Backend registration

```ts
import { CustomerPortalModule } from './modules/customer-portal';

@Module({
  imports: [CustomerPortalModule],
})
export class AppModule {}
```

## Customer identity

Portal users are resolved by matching `AuthUser.email` / `AuthUser.mobile` against `Customer.contact` (and `additionalContacts`). If no match, `GET /customer-portal/me` returns **403** with a clear message.

Staff with `customer_portal.manage` may pass `?customerId=` on list endpoints or use the overview route.

## Routes

| Method | Path | Permission |
|--------|------|------------|
| GET | `/customer-portal/me` | `customer_portal.view` |
| GET | `/customer-portal/bookings` | `customer_portal.view` or `manage` |
| GET | `/customer-portal/demands` | `customer_portal.view` or `manage` |
| GET | `/customer-portal/receipts` | `customer_portal.view` or `manage` |
| GET | `/customer-portal/payment-schedule` | `customer_portal.view` or `manage` |
| GET | `/customer-portal/agreements` | `customer_portal.view` or `manage` |
| GET | `/customer-portal/warranties` | `customer_portal.view` or `manage` |
| POST | `/customer-portal/warranties` | `customer_portal.view` |
| GET | `/customer-portal/construction-progress?projectId=` | `customer_portal.view` |
| GET | `/customer-portal/customers/:customerId/overview` | `customer_portal.manage` |

## Data sources

Bookings, payment demands, receipts, active schedules, sale agreements, warranty tickets, and construction progress (approved DPR count) — all from existing CRM collections; no new schemas.
