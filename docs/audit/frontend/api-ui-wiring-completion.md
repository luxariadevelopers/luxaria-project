# Frontend API-to-UI wiring — completion report

**Overall verdict:** PARTIAL  
**Baseline commit:** `603c8c9`  
**Current HEAD (pre-this-doc-commit):** `89ac033`  
**Audit date:** 2026-07-21  
**Inventory:** [`api-ui-wiring-inventory.csv`](./api-ui-wiring-inventory.csv)

## Executive summary

Remediation from `603c8c9` registered production web routes for admin, projects, construction, sales/collections, reports hubs, and mobile operational screens. Parallel follow-up agents added payment schedules, accounting reports hub, manpower plans, signed payment vouchers (web), director digest, mobile material-issue create, and project-creation Playwright coverage.

Web and mobile typecheck pass. Remaining gaps are mostly secondary routes (contractor detail), investor-portal POSTs, approval-workflow config admin, booking create/transition UI, and broader E2E coverage.

## Scorecard by phase / module

| Phase / module | Verdict | Notes |
| --- | --- | --- |
| Auth & session | **PASS** | Login + settings/session |
| Admin (company, users, RBAC, audit, health, director digest) | **PASS** | Digest at `/administration/director-digest` |
| Projects & access | **PASS** | Create + E2E live coverage |
| Dashboards | **PASS** | Director, finance, site, purchase, funding |
| Approvals | **PASS** | Web + mobile |
| Project control | **PARTIAL** | Web complete; mobile lacks BOQ |
| Procurement | **PASS** | Golden-path E2E |
| Contractors / manpower / signed vouchers | **PASS** | Plans + shortfall + signed vouchers web |
| Inventory | **PASS** | Mobile issue create added (`89ac033`) |
| Sales / collections / payment schedules | **PARTIAL** | Schedules wired; booking create/transition still soft gap |
| Accounting core | **PASS** | Journals, COA, bank recon, period close |
| Petty cash | **PASS** | Golden-path E2E |
| Accounting reports | **PASS** | Hub `/reports/accounting` + cash/bank books |
| Construction reports | **PASS** | Hub covers all Nest variants |
| Investor portal | **PARTIAL** | Some POST endpoints unwired |
| Mobile operational stack | **PASS** | Create/list/detail flows registered |

## Remaining gaps

| Item | Status |
| --- | --- |
| Booking create / status-transition UI | Soft gap — register list only |
| Contractor master detail route | List wired; no `/contractors/:id` |
| Approval workflow config admin | `PUT /approval-workflows` unwired |
| Investor portal report/profit POSTs | Unwired |
| Broader Playwright matrix | Most modules `NONE`; project-creation + register smokes exist |

## Remediation commits (`603c8c9..HEAD`)

```
89ac033 feat(mobile): add material issue create flow
be1de68 test(web): add project creation Playwright coverage
238d36f feat(mobile): wire remaining Nest operational workflows
940f99c feat(web): add construction reports hub
b233639 feat(web): wire contractor master, DPR detail, and orphaned list UIs
0b773e5 chore: stop tracking backend .env.development
63e9383 fix(projects): stop gating list/create on company.view
309fa3a feat(admin): wire company, users, RBAC, and financial years
61b1823 feat(projects): wire project administration workflow
a0d3760 feat(web): register existing production workflow pages
5b5c5d6 feat(mobile): register operational workflow screens
4239c1a fix(web): restore type-safe feature contracts
```

Plus subsequent commit(s) wiring payment schedules, accounting hub, manpower plans, signed vouchers, and director digest.

## Typecheck / build notes

| App | Command | Result |
| --- | --- | --- |
| Web | `pnpm --filter @luxaria/web typecheck` | **PASS** |
| Mobile | `pnpm --filter @luxaria/mobile typecheck` | **PASS** |
| Web build | `pnpm --filter @luxaria/web build` | **PASS** (verified earlier in campaign) |

## E2E status summary

| Spec | Status |
| --- | --- |
| `project-creation.spec.ts` | Live API create + validation |
| `golden-path-booking-collection.spec.ts` | Register smoke unskipped; full journey still skipped |
| `golden-path-procurement.spec.ts` | Active |
| `golden-path-petty-cash.spec.ts` | Active |
| Smoke specs | Active |

## Regeneration

1. Inventory Nest controllers under `apps/backend/src/modules/*/*.controller.ts`.
2. Cross-check `apps/web/src/navigation/routeRegistry.ts` + feature `api.ts` modules.
3. Cross-check `apps/mobile/src/navigation/RootNavigator.tsx`.
4. Refresh this scorecard and `api-ui-wiring-inventory.csv`.
5. Re-run web/mobile typecheck and note Playwright live vs shell projects.
