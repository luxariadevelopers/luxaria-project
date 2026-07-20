# Micro Phase 137 — Playwright E2E foundation

**Status:** Complete  
**Layer:** Web (`apps/web`)

## Objective

Production-grade Playwright end-to-end foundation with auth helpers, API fixtures, page objects, trace/video capture, seeded test-user env vars, smoke coverage, and CI wiring.

## Delivered

| Area | Location |
|------|----------|
| Playwright config (trace/video, projects, global setup) | `apps/web/playwright.config.ts` |
| Test env + seeded credentials | `apps/web/.env.e2e.example`, `e2e/fixtures/test-env.ts` |
| API client + seed/bootstrap | `e2e/fixtures/api-client.ts`, `e2e/fixtures/seed-data.ts` |
| Auth helpers + storage states | `e2e/fixtures/auth.ts`, `e2e/auth.setup.ts` |
| Custom fixtures | `e2e/fixtures/index.ts` |
| Page objects | `e2e/pages/*.page.ts` |
| Smoke specs | `e2e/smoke.spec.ts`, `e2e/*.smoke.spec.ts` |
| CI job | `.github/workflows/pr-validation.yml` → `playwright-e2e` |
| Docs | `docs/TESTING.md`, `docs/CI.md` |

## Smoke coverage

1. **Shell** — app boot / login affordance (`smoke.spec.ts`, no backend)
2. **Login** — admin UI sign-in → dashboard (`login.smoke.spec.ts`)
3. **Permission denial** — limited user → `/users` → forbidden (`permissions.smoke.spec.ts`)
4. **Project selection** — header selector updates dashboard (`project-selection.smoke.spec.ts`)
5. **Approvals API** — list + draft create via existing `/projects/:id/approvals` (`approvals.smoke.spec.ts`)

## Test credentials

Dedicated **non-production** users only (see `apps/web/.env.e2e.example`):

- `E2E_ADMIN_*` — bootstrap admin (Super Admin bypass)
- `E2E_LIMITED_*` — `dashboard.view` only role for RBAC smoke
- `E2E_PROJECT_NAME` — idempotent seeded project for selector smoke

## Local commands

```bash
# Shell smoke only (Vite; no API)
pnpm --filter @luxaria/web test:e2e

# Full live stack (Mongo on :9017 or :27017, API on :9000)
cp apps/web/.env.e2e.example apps/web/.env.e2e.local   # optional
docker compose up -d mongo
pnpm --filter @luxaria/backend build && pnpm --filter @luxaria/backend start
E2E_LIVE_API=true pnpm --filter @luxaria/web test:e2e:live
```

## CI

PR Validation runs `playwright-e2e` with an ephemeral Mongo service, boots Nest on port 9000, seeds via `global-setup`, and uploads Playwright artifacts on failure.

## Out of scope (Phase 138)

Golden-path business journeys (PR → PO → GRN → …) are intentionally not included.

## Acceptance

- [x] Auth helpers and storage-state setup
- [x] API fixtures against real Nest endpoints (no invented routes)
- [x] Page objects for login / dashboard / forbidden
- [x] Trace + video on CI failure
- [x] Seeded test-user env vars documented
- [x] Login, permission denial, project selection, approval API smoke
- [x] CI job wired into PR gate
- [x] Testing docs updated
