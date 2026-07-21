# Frontend API-to-UI wiring — completion report

**Overall verdict:** IN_PROGRESS  
**Baseline commit:** `603c8c9`  
**Current HEAD:** `e7c9ed3f6d005cbb5b12d7f70f63987936e94004`  
**Audit date:** 2026-07-21  
**Inventory:** [`api-ui-wiring-inventory.csv`](./api-ui-wiring-inventory.csv)

## Executive summary

Remediation from `603c8c9` registered production web routes for admin, projects, construction, sales/collections, reports hubs, and mobile operational screens. Commit `e7c9ed3` closed the remaining Nest UI gaps: payment schedules (`/sales/payment-schedules`), accounting reports hub (`/reports/accounting`), manpower plans, signed payment vouchers (web), and director digest admin.

Web and mobile typecheck pass. **Overall wiring is no longer blocked by missing routes**, but the campaign stays **IN_PROGRESS** until booking create/status-transition UI lands — that is the last sales golden-path gap and prevents a full PASS closeout. Parent agent should refresh this doc after that merge.

## Scorecard by phase / module

| Phase / module | Verdict | Notes |
| --- | --- | --- |
| Auth & session | **PASS** | Login + settings profile at `/settings` |
| Admin (company, users, RBAC, audit, health, director digest) | **PASS** | Digest at `/administration/director-digest` |
| Projects & access | **PASS** | Create + live E2E (AC-1..AC-5) |
| Dashboards | **PASS** | Director, finance, site, purchase, funding |
| Approvals | **PASS** | Web + mobile |
| Project control | **PARTIAL** | Web complete; mobile lacks BOQ |
| Procurement | **PASS** | PR register golden-path smoke unskipped |
| Contractors / manpower / signed vouchers | **PARTIAL** | Plans + shortfall + signed vouchers web; **no contractor detail route** |
| Inventory | **PASS** | Mobile issue create (`89ac033`) |
| Sales / collections / payment schedules | **IN_PROGRESS** | Schedules wired; **booking create/transition UI still landing** |
| Accounting core | **PASS** | Journals, COA, bank recon, period close |
| Petty cash | **PASS** | Register + create form golden-path smoke unskipped |
| Accounting reports | **PASS** | Hub `/reports/accounting` + cash/bank books |
| Construction reports | **PASS** | Hub covers all Nest variants |
| Investor portal | **PARTIAL** | Manage POST panels exist but not on staff routes |
| Mobile operational stack | **PASS** | Create/list/detail flows registered |

## Remaining gaps (honest)

| Item | Status |
| --- | --- |
| Booking create / status-transition UI | **Blocker for PASS** — register list only; golden-path E2E journey skipped |
| Contractor master detail route | List + drawers wired; no `/contractors/:id` |
| Approval workflow config admin | `PUT /approval-workflows` unwired |
| Investor portal staff manage routes | POST report/profit panels not on staff nav |
| Manpower plan compare | Compare API used indirectly; no dedicated compare UI |
| Per-report accounting pages | Hub runs catalogue; TB/GL/etc. lack standalone routes (by design) |
| Multi-actor golden paths | Procurement/petty-cash/booking full journeys skipped — seed lacks distinct approvers |

## Remediation commits (`603c8c9..HEAD`)

```
e7c9ed3 feat(web): wire remaining Nest UI gaps and register routes
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

## Typecheck / build notes

| App | Command | Result |
| --- | --- | --- |
| Web | `pnpm --filter @luxaria/web typecheck` | **PASS** |
| Mobile | `pnpm --filter @luxaria/mobile typecheck` | **PASS** |
| Web build | `pnpm --filter @luxaria/web build` | **PASS** (verified earlier in campaign) |

## E2E status summary

Playwright projects: `chromium-shell` (no backend), `chromium-live` (smokes + project creation), `chromium-golden-path` (register smokes + skipped multi-actor journeys).

| Spec | Coverage |
| --- | --- |
| `smoke.spec.ts` | Unauthenticated shell |
| `login.smoke.spec.ts` | Admin sign-in → dashboard |
| `permissions.smoke.spec.ts` | Limited user → forbidden |
| `project-selection.smoke.spec.ts` | Header project selector (seeded project) |
| `approvals.smoke.spec.ts` | Approvals API list + draft create |
| `project-creation.spec.ts` | AC-1 create; AC-2 validation; AC-3 list refresh; AC-4 detail (create + register); AC-5 selector; AC-6 duplicate skipped |
| `payment-schedules.smoke.spec.ts` | `/sales/payment-schedules` open + filters |
| `accounting-reports.smoke.spec.ts` | `/reports/accounting` hub open |
| `contractors.smoke.spec.ts` | `/contractors` list; detail route skipped |
| `settings.smoke.spec.ts` | `/settings` profile panel |
| `golden-path-booking-collection.spec.ts` | Booking + collections register smoke; full journey skipped (create UI + actors) |
| `golden-path-procurement.spec.ts` | PR register smoke; full journey skipped (multi-actor) |
| `golden-path-petty-cash.spec.ts` | Petty-cash register + create form smoke; full journey skipped (multi-actor) |

## Regeneration

1. Inventory Nest controllers under `apps/backend/src/modules/*/*.controller.ts`.
2. Cross-check `apps/web/src/navigation/routeRegistry.ts` + feature `api.ts` modules.
3. Cross-check `apps/mobile/src/navigation/RootNavigator.tsx`.
4. Refresh this scorecard and `api-ui-wiring-inventory.csv`.
5. Re-run web/mobile typecheck and note Playwright live vs shell projects.
6. Record `git rev-parse HEAD` as **Current HEAD** above.
