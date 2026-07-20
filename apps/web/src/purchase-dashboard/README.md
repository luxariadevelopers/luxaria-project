# Purchase dashboard (Micro Phase 025)

Route: `/dashboard/purchase`

## APIs (existing — no dedicated purchase-dashboard module)

| Endpoint | Permission | Use |
|---|---|---|
| `GET /purchase-requests` | `purchase.view` | Pending PR pipeline counts (`meta.total`) + ageing |
| `GET /purchase-orders` | `purchase.view` | Pending/open PO counts + due delivery list |
| `GET /vendor-invoices` | `vendor_invoice.view` | `matchingStatus=exception` + payment-due ageing |

Route guard uses **`dashboard.view`** (RBAC has no `dashboard.purchase.view`).

## Filters

Date and project are **required** before queries run. Project selection syncs the header project context.
