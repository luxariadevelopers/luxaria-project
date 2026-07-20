# Quick search command palette (Micro Phase 017)

Global command palette for fast navigation to permitted records.

## Open

- Header search icon
- `⌘K` / `Ctrl+K`
- `/` when focus is not in an editable field

## APIs consumed

| Source | Endpoint | Permission |
|--------|----------|------------|
| Projects | `GET /projects?search=` | `project.view` |
| Vendors | `GET /vendors?search=` | `vendor.view` |
| Contractors | `GET /contractors?search=` | `contractor.view` |
| Customers | `GET /customers?search=` | `customer.view` |
| Purchase orders | `GET /purchase-orders?search=` | `purchase.view` |
| Purchase requests | `GET /purchase-requests?search=` | `purchase.view` |
| Bookings | `GET /bookings?search=` | `booking.view` |

Journal entries are **not** included — `GET /journals` has no `search` query (no backend redesign).

Project-scoped transaction / party lists pass the selected `projectId` when available. Backend still enforces permissions and project access; UI filtering alone is not sufficient.

## Rules

- Debounce: 300ms (`QUICK_SEARCH_DEBOUNCE_MS`)
- Minimum length: 2 (`QUICK_SEARCH_MIN_LENGTH`)
- Limit: 5 hits per source

## Components

| Export | Role |
|--------|------|
| `QuickSearchProvider` | ⌘K listener + mounts dialog |
| `CommandDialog` | Grouped results, keyboard nav, loading/empty/403/retry |
| `filterPermittedSources` | Client-side source gating |
| `ModuleRecordPage` | Thin landing for targets until full module UIs ship |

## Navigation

Target routes are registered with `showInNav: false` (header search only — no new sidebar items):

`/vendors`, `/contractors`, `/customers`, `/purchase-orders`, `/procurement/purchase-requests/:id`, `/sales/bookings`

Each is guarded by `RegistryRouteGuard` with the matching view permission.
