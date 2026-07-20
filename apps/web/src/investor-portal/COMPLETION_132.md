# COMPLETION — Micro Phase 132

**Objective:** Dedicated investor portal shell — separate restricted investor-facing area.

## Delivered

- [x] `apps/web/src/investor-portal/` module with isolated layout, login, guards, API client, context
- [x] Routes: `/investor/login`, `/investor`, `/investor/dashboard`, `/investor/forbidden`
- [x] Session/profile from `GET /investor-portal/me`
- [x] Project selector from `GET /investor-portal/projects` (separate storage key from staff selector)
- [x] Permission gate: `investor_portal.view` (Nest catalog — not `investor.portal.*`)
- [x] Investor-only sessions blocked from internal ERP routes (`InternalAppGuard` + `ProtectedRoute`)
- [x] No internal `Sidebar` / staff nav links in investor shell
- [x] Loading, empty, error, 403, and retry states
- [x] Vitest: `session.test.ts`, `route-isolation.test.tsx`
- [x] `docs/ui-api-matrix.md` note updated

## Out of scope (phase 133+)

- Project detail pages (`GET /investor-portal/projects/:projectId`)
- Manage endpoints (`investor_portal.manage`)
- Staff CRM `/capital/investors` UI

## Verification

```bash
pnpm --filter @luxaria/web typecheck
pnpm --filter @luxaria/web lint
pnpm --filter @luxaria/web test:unit
```

## Merge snippets

```text
apps/web/src/investor-portal/**          (new module)
apps/web/src/routes/index.tsx          (investor route tree)
apps/web/src/auth/ProtectedRoute.tsx     (session isolation)
apps/web/src/pages/LoginPage.tsx         (investor redirect)
apps/web/src/api/client.ts               (401 investor redirect)
apps/web/package.json                    (vitest)
apps/web/vite.config.ts                  (vitest config)
docs/ui-api-matrix.md                    (UI coverage row)
```
