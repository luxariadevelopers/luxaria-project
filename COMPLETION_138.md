# COMPLETION_138 — Cross-module golden-path E2E

## Objective

Cross-module golden-path scenarios: procurement, petty cash, and booking/collection — represented in Playwright with explicit capability skips and exercised end-to-end through backend Supertest with deterministic seeds.

## Delivered

### Playwright (`apps/web/e2e/`)

| Journey | Spec | Browser status |
|---------|------|----------------|
| PR → PO → GRN → invoice → payment | `golden-path-procurement.spec.ts` | Skipped: UI absent; phase 137 lacks distinct purchase/finance approver seeds |
| Petty cash → expense → posting | `golden-path-petty-cash.spec.ts` | Skipped: UI absent; maker/checker/poster identities are not seeded |
| Booking → collection | `golden-path-booking-collection.spec.ts` | Skipped: UI absent; sales/finance approvers are not seeded |

Reused phase 137 foundation from `luxaria-phase137-b87bee10`: `fixtures/`, `pages/`, `global-setup.ts`, `auth.setup.ts`, enhanced `playwright.config.ts` (screenshot on failure, golden-path project).

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

## Run

```bash
# Playwright (live API: E2E_LIVE_API=true + backend on :9000)
pnpm --filter @luxaria/web test:e2e -- --project=chromium-golden-path

# Backend in-memory golden paths
pnpm --filter @luxaria/backend test:e2e -- golden-path
```

## Verification

- Playwright discovery: 8 tests listed across setup and golden-path projects.
- Backend: 3 suites, 6 tests passed (booking/collection in the full run; procurement and petty cash rerun after fixes).

## Worktree

- **WORKTREE_ID:** `luxaria-57b7dbfa`
- **WORKTREE_PATH:** `~/.cursor/worktrees/luxaria-57b7dbfa/luxaria project-fa80d8f4bb3b`
- **Setup:** no `.cursor/worktrees.json` — skipped after checking repo + worktree
- Merge: `/apply-worktree` · Cleanup: `/delete-worktree`
