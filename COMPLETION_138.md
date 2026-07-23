# COMPLETION_138 — Cross-module golden-path E2E

## Objective

Cross-module golden-path scenarios: procurement, petty cash, and booking/collection — represented in Playwright with explicit capability skips and exercised end-to-end through backend Supertest with deterministic seeds.

## Delivered

### Playwright (`apps/web/e2e/`)

| Journey | Spec | Browser status |
|---------|------|----------------|
| PR → PO → GRN → invoice → payment | `golden-path-procurement.spec.ts` | **Unskipped** UI end-to-end (`UI: end-to-end procurement journey`) + API-assisted + register smoke |
| Petty cash → expense → posting | `golden-path-petty-cash.spec.ts` | **Unskipped** UI end-to-end (`UI: end-to-end petty cash journey`) + API-assisted + register/create smoke |
| Booking → collection | `golden-path-booking-collection.spec.ts` | UI booking journey (create → reserved → booked) + register smoke + API-assisted |

Hard `test.skip(true, …)` removed from procurement and petty-cash UI journeys.

Reused phase 137 foundation: `fixtures/`, `pages/`, `helpers/`, `global-setup.ts`, `auth.setup.ts`, `playwright.config.ts` (screenshot on failure, golden-path project).

### Product UI gap closed for procurement

Minimal web GRN create at `/inventory/grns/new` (`GrnCreatePage`) so PR→PO→GRN can complete in the browser (list CTA **New goods receipt**).

Petty-cash UI journey uses **LABOUR** (signature-only) for site expense create so bill/photo upload is not required.

### Backend API (`apps/backend/test/`)

| Journey | Spec |
|---------|------|
| Procurement | `golden-path-procurement.e2e-spec.ts` |
| Petty cash | `golden-path-petty-cash.e2e-spec.ts` |
| Booking / collection | `golden-path-booking-collection.e2e-spec.ts` |

Helpers: `test/helpers/golden-path/` — env, deterministic IDs, full-app bootstrap, seed, auth, cleanup.

All three backend journeys are live and use a Mongo replica set so transaction-backed approvals and posting execute normally.

### Role boundaries

Backend suites assert **403** for roles lacking downstream permissions (`PURCHASE_EXECUTIVE`, `SITE_ENGINEER`).

## Remaining skips (conditional / environment — not hard product gaps)

| Spec | Skip condition |
|------|----------------|
| All golden-path specs | `!isLiveApi()` — needs `E2E_LIVE_API=true` or `CI` |
| Actor/master gates | Seed failure or missing golden-path actors / project / material+vendor labels |
| `project-creation.spec.ts` | One hard skip remains: duplicate project code (server-generated; no client field) — unrelated to Phase 138 |

No hard skip remains on the procurement or petty-cash UI golden-path journeys.

## Run

```bash
# Playwright golden-path (live API: backend on :9000)
E2E_LIVE_API=true pnpm --filter @luxaria/web test:e2e -- --project=chromium-golden-path

# Single specs
E2E_LIVE_API=true pnpm --filter @luxaria/web test:e2e -- --project=chromium-golden-path e2e/golden-path-procurement.spec.ts
E2E_LIVE_API=true pnpm --filter @luxaria/web test:e2e -- --project=chromium-golden-path e2e/golden-path-petty-cash.spec.ts

# Backend in-memory golden paths
pnpm --filter @luxaria/backend test:e2e -- golden-path
```

## Verification

- Playwright discovery includes unskipped UI end-to-end titles for procurement and petty cash.
- Typecheck / lint e2e helpers and specs when the live stack is unavailable.
- Backend: 3 suites (procurement, petty cash, booking/collection).
