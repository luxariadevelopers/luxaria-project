# R-004 / R-005 Completion Report

**Phases:** R-004 Repair web/investor production build · R-005 Green quality gates  
**Defects:** DEF-WEB-001, DEF-BUILD-001, DEF-MOB-001  
**Timestamp:** 2026-07-20  
**Scope confirmation:** R-001, R-002, R-003 and later remediation phases were **not** implemented.

## Defects addressed

| Defect ID | Status | Notes |
| --- | --- | --- |
| DEF-WEB-001 | Resolved | Investor portal imports + MUI Stack typing fixed; web typecheck/build/Docker green |
| DEF-MOB-001 | Resolved | Mobile notification client exports restored; mobile typecheck green |
| DEF-BUILD-001 | Partially Resolved | Workspace typecheck/lint/build green; `format:check` still fails (~2,388 files) and is deferred (not in CI PR gate) |

## Root causes

1. **DEF-WEB-001 — broken relative imports**  
   `InvestorDashboardPage` / `InvestorProjectDetailPage` imported sibling modules via `../` instead of `./`, so TypeScript could not resolve `api`, `access`, `format`, or local `components/*`.

2. **DEF-WEB-001 — MUI v9 Stack API**  
   Installed `@mui/material` Stack own-props are `direction`, `spacing`, `divider`, `useFlexGap`, `sx` only. System layout props (`alignItems`, `justifyContent`, `flexWrap`, `gap`) must be passed through `sx` (matches existing accounting-report patterns).

3. **DEF-WEB-001 — incomplete web detail type**  
   Web `InvestorPortalProjectDetail` omitted `investment` / `progress` / `budget` / `profit` / `restrictions` that the backend already returns and the detail page already consumes.

4. **DEF-MOB-001 — incomplete mobile notification client**  
   Screens expected inbox helpers (`listNotifications`, unread count, mark-read) and `InboxNotification`, but `notifications.ts` only exposed preferences/push tokens. Client also called missing `apiPut` and a 2-arg `apiDelete`.

5. **DEF-BUILD-001 — lint errors**  
   Backend: unused `key` / unused `Model` import in health/email specs.  
   Web (surfaced after backend lint unblocked): Playwright fixture `use` tripped `react-hooks/rules-of-hooks`; investor `api.test.ts` used forbidden `import()` type annotations.

6. **DEF-BUILD-001 — formatting**  
   `pnpm format:check` reports ~2,388 unformatted **source** files across apps/packages/docs. Not caused by generated build output. Mass Prettier rewrite deferred (roadmap note: separate formatting-only change). CI `PR Validation` does **not** run `format:check`.

## Compatibility note (mobile notifications)

Mobile inbox client now mirrors the proven web client and backend routes:

| Function | Backend |
| --- | --- |
| `listNotifications` | `GET /notifications` |
| `fetchUnreadNotificationCount` | derived from `GET /notifications?unreadOnly=true&limit=1` (`meta.total`) — no dedicated count endpoint |
| `markNotificationRead` | `PATCH /notifications/:id/read` |
| `markAllNotificationsRead` | `POST /notifications/read-all` |
| preferences / push tokens | existing `GET|PUT /preferences`, push-token routes |

No invented endpoints. Mobile `apiPut` added; `apiDelete` accepts optional `{ data }` for unregister body.

## Files created

- `docs/audit/remediation/R-004-R-005-completion.md`
- `apps/mobile/src/api/__tests__/notifications.test.ts`

## Files modified

- `apps/web/src/investor-portal/InvestorDashboardPage.tsx`
- `apps/web/src/investor-portal/InvestorProjectDetailPage.tsx`
- `apps/web/src/investor-portal/components/MetricCard.tsx`
- `apps/web/src/investor-portal/components/ProjectSummaryCard.tsx`
- `apps/web/src/investor-portal/types.ts`
- `apps/web/src/investor-portal/api.test.ts`
- `apps/web/e2e/fixtures/index.ts`
- `apps/mobile/src/api/notifications.ts`
- `apps/mobile/src/api/client.ts`
- `apps/backend/src/modules/health/health.service.spec.ts`
- `apps/backend/src/modules/notifications/channels/email.channel.spec.ts`
- `docs/audit/54-master-defect-register.csv`

## Commands run and exit codes

| Command | Exit |
| --- | --- |
| `pnpm typecheck` | 0 |
| `pnpm lint` | 0 (warnings only: backend `no-explicit-any` ×5; web exhaustive-deps ×1) |
| `pnpm --filter @luxaria/web typecheck` | 0 |
| `pnpm --filter @luxaria/web build` | 0 |
| `pnpm --filter @luxaria/backend build` | 0 |
| `pnpm --filter @luxaria/mobile typecheck` | 0 |
| `pnpm --filter @luxaria/web test:unit` | 0 (280 files / 1274 tests) |
| `pnpm --filter @luxaria/mobile test:unit -- src/api/__tests__/notifications.test.ts` | 0 (4 tests) |
| `pnpm --filter @luxaria/backend test:unit -- health.service.spec.ts email.channel.spec.ts` | 0 (7 tests) |
| `docker compose config` | 0 |
| `docker build -f apps/web/Dockerfile -t luxaria-web:r004-r005 .` | 0 |
| `docker build -f apps/backend/Dockerfile -t luxaria-backend:r004-r005 .` | 0 |

## Tests passed

- Web unit suite (includes investor-portal tests)
- Mobile notification client unit tests
- Backend health.service + email.channel unit specs

## Tests not run

- Full backend `test:unit` / `test:integration` / `test:api` suite (MongoMemoryServer historically fails on this host — DEF-TEST-001; environmental)
- Web Playwright e2e (out of scope; DEF-E2E-001 still open)
- Full mobile test suite beyond notification client tests
- `pnpm format:check` / mass `pnpm format` (deferred; see below)

## Remaining failures

| Item | Classification | Status |
| --- | --- | --- |
| `pnpm format:check` (~2,388 files) | Code style debt | Deferred; not a CI PR-gate job |
| Backend `@typescript-eslint/no-explicit-any` warnings | Lint warnings | Non-blocking (exit 0) |
| InvestorPortalContext exhaustive-deps warning | Lint warning | Non-blocking (exit 0) |
| MongoMemoryServer / full backend unit+integration | Environment / test infrastructure | Not addressed (DEF-TEST-001 / R-011) |

## Docker build results

- **Web production image:** success (`luxaria-web:r004-r005`)
- **Backend production image:** success (`luxaria-backend:r004-r005`)
- Bundle contains investor routes: `/investor/login`, `/investor/dashboard`, `/investor/projects/...`, `/investor/documents`, `/investor/statements`, `/investor/forbidden`

## Quality gates green?

**Ship-path CI gates for typecheck / lint / backend build / web build:** yes (verified locally with the same commands as `.github/workflows/pr-validation.yml`).

**Full monorepo including Prettier format:check:** no — formatting remains deferred as a separate formatting-only change.

## Explicit non-scope

- No accounting logic changes (R-001 / R-002)
- No project-access / permission behaviour changes (R-003)
- No page redesigns
- No later remediation phases (R-006+)
- No `any`, `@ts-ignore`, `eslint-disable`, or skipped tests introduced to force green
