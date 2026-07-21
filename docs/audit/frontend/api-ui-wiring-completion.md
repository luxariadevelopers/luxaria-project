# Frontend API-to-UI wiring — completion report

**Overall verdict:** PASS  
**Baseline commit:** `603c8c9`  
**Current HEAD:** `bf358a2` (wiring audit PASS + multi-actor golden paths / smokes)  
**Audit date:** 2026-07-21  
**Inventory:** [`api-ui-wiring-inventory.csv`](./api-ui-wiring-inventory.csv)

## Executive summary

Strict remediation closeout is complete: every previously blocked Nest surface has a production-reachable web and/or mobile UI that calls real APIs with permissions and loading/empty/error states. Web and mobile typecheck pass.

E2E/integration coverage (criterion 7) is satisfied by:

1. **Playwright API-assisted golden paths** with multi-actor seeds (sales/finance/purchase/finance-manager)
2. **Playwright live-API smokes** for registers and create pages
3. **Backend Supertest golden-path** specs (deterministic Nest harness)

Optional gap only: full browser click-through of PR→PO→GRN→invoice→payment (API-assisted covers the workflow; UI register smoke covers navigation).

## Scorecard

| Phase / module | Verdict |
| --- | --- |
| Compile / routing | **PASS** |
| Project + admin + settings + director digest + approval workflows | **PASS** |
| Construction (manpower plans, signed vouchers, contractor detail, material issues) | **PASS** |
| Sales / collections / payment schedules / bookings write | **PASS** |
| Reports (accounting + construction hubs) | **PASS** |
| Investor portal manage (incl. GET profit allocations) | **PASS** |
| Mobile ops + deep links + offline draft creates | **PASS** |
| Playwright multi-actor API-assisted golden paths | **PASS** |
| Playwright live-API smokes | **PASS** |
| Backend golden-path Supertest | **PASS** |

## Multi-actor Playwright seeds

Seeded in `apps/web/e2e/fixtures/seed-data.ts` when `E2E_LIVE_API=true` / CI:

| Actor | Default email | Catalog roles |
| --- | --- | --- |
| Sales approver | `e2e-sales-approver@luxaria.test` | PROJECT_MANAGER, SALES_MANAGER |
| Finance approver | `e2e-finance-approver@luxaria.test` | FINANCE_DIRECTOR, FINANCE_MANAGER, SALES_MANAGER |
| Purchase approver | `e2e-purchase-approver@luxaria.test` | PROJECT_MANAGER, PURCHASE_MANAGER |
| Finance manager | `e2e-finance-manager@luxaria.test` | FINANCE_DIRECTOR, FINANCE_MANAGER, PURCHASE_MANAGER |

Also seeds master data (customer, unit, material, vendor, bank, expense category) for journeys.

## Playwright golden paths

| Journey | Spec | Coverage |
| --- | --- | --- |
| Booking → collection | `golden-path-booking-collection.spec.ts` | API-assisted + UI create/transition to booked |
| Procurement | `golden-path-procurement.spec.ts` | API-assisted PR→PO→GRN→invoice→payment |
| Petty cash | `golden-path-petty-cash.spec.ts` | API-assisted request → expense → posting |

Run (API up on `:9000`):

```bash
E2E_LIVE_API=true pnpm --filter @luxaria/web exec playwright test --project=chromium-golden-path
E2E_LIVE_API=true pnpm --filter @luxaria/web exec playwright test --project=chromium-live
```

## Backend golden-path E2E

| Journey | Spec |
| --- | --- |
| Procurement | `apps/backend/test/golden-path-procurement.e2e-spec.ts` |
| Petty cash | `apps/backend/test/golden-path-petty-cash.e2e-spec.ts` |
| Booking → collection | `apps/backend/test/golden-path-booking-collection.e2e-spec.ts` |
| Contractor billing | `apps/backend/test/golden-path-contractor-billing.e2e-spec.ts` |

```bash
pnpm --filter @luxaria/backend test:e2e -- golden-path
```

## Intentional non-blockers

- Full multi-screen procurement **UI** click-through not automated (API-assisted + register smoke suffice for criterion 7).
- Material-issue signatures/submit remain web-side after mobile offline draft sync.
- Project duplicate-code UI E2E N/A (server-generated codes).

## Regeneration

Refresh `api-ui-wiring-inventory.csv` from Nest controllers × `routeRegistry` × mobile `RootNavigator` after major wiring changes.
