# Vendors (Micro Phase 056)

Route: `/procurement/vendors` — searchable vendor master (Procurement → Vendors).

## APIs

| Endpoint | Permission |
|---|---|
| `GET /vendors` | `vendor.view` |
| `POST /vendors` | `vendor.manage` |
| `PATCH /vendors/:id` | `vendor.manage` |
| `POST /vendors/:id/verify` | `vendor.manage` |
| `POST /vendors/:id/activate` | `vendor.manage` |
| `POST /vendors/:id/block` | `vendor.manage` |

Nest catalog has **no** `vendor.create` / `vendor.update` / `vendor.block` — UI maps those actions to `vendor.manage`.

## Security notes

- List projection (`toVendorListRow`) strips `bankDetails` / account fields before the table.
- Create may capture optional bank fields; they are never rendered in the list.
- Edit drawer does not display or patch bank account numbers.
- `RegistryRouteGuard` + Nest 403 — hiding buttons is not enough; page shows `PermissionDenied` without `vendor.view`.

## UI

- `VendorTable` — codes, GSTIN/PAN, categories, rating, verification, blocked status
- `VendorFilters` — status, verification, material category (+ search)
- Create / edit drawers with GSTIN/PAN validation
- Block dialog with optional reason

---

# Vendors — 360° view (Micro Phase 057)

Routes:
- `/procurement/vendors` — list landing (Phase 056 owns full master UI)
- `/procurement/vendors/:vendorId` — vendor 360 detail (this phase)

Legacy `/vendors?id=` redirects to the detail route for quick-search deep links.

## APIs (existing Nest only)

| Endpoint | Permission |
|---|---|
| `GET /vendors/:id` | `vendor.view` |
| `GET /vendors/:id/documents` | `vendor.view` |
| `GET /vendors/:id/projects` | `vendor.view` |
| `GET /vendors/:id/ledger` | `vendor.view` (placeholder payable ledger) |
| `GET /vendor-invoices?vendorId=` | `vendor_invoice.view` |
| `GET /vendor-payments?vendorId=` | `payment.view` |
| `GET /vendors/:vendorId/quality-score` | `quality.view` (optional performance enrichment) |

## Tabs & permissions

| Tab | Shown when |
|---|---|
| Overview · Bank · Documents · Projects · Performance | `vendor.view` |
| Payable summary · Payments · Ledger | `payment.view` (finance) |
| Invoices | `vendor_invoice.view` |

Ledger HTTP still requires `vendor.view`; the UI hides finance tabs unless `payment.view` is granted. Route guard + Nest 403 — hiding tabs is not enough.

## Security

- Bank account numbers are **masked by default** (`VendorBankCard` + `bankMasking.ts`), even when Nest decrypts `accountNumber`.
- List safety helper `toListSafeVendorBank` nulls full account numbers before any list projection (Phase 056).

## Components

`apps/web/src/vendors` — tab panels, payable summary, role/tab helpers, React Query hooks.
