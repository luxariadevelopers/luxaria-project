# R-003B completion — Service-level isolation & seeded HTTP IDOR

**Verdict:** PARTIAL  
**Date:** 2026-07-20  
**Baseline commit:** `667b17235e56f8a34a0b85c768fcbce0434b1bd5`  
**DEF-SEC-001:** Remains **Partially Resolved** (acceptance criteria not fully met)

### Verification snapshot

| Command | Result |
| --- | --- |
| `pnpm --filter @luxaria/backend typecheck` | PASS |
| `pnpm --filter @luxaria/backend build` | PASS |
| project-access unit + enforcement specs | PASS (28) |
| `r003-idor-matrix` + `project-access` e2e | PASS (16) |
| `r003b-http-idor` seeded HTTP e2e | PASS (13) |
| `scripts/r003-scan-route-scopes.mjs` | PASS (0 unclassified) |
| web `tsc` | FAIL — pre-existing `vendor-invoices` / MUI typings (not R-003B) |

R-004+ / accounting behaviour changes: **Not implemented**.

## Baseline (Step 1)

| Item | Value |
| --- | --- |
| Branch | `main` |
| Baseline commit | `667b17235e56f8a34a0b85c768fcbce0434b1bd5` |
| Prior R-003 | Uncommitted working-tree work on default-deny guards + route classification |
| Route inventory | 401 project / 209 global / 8 public / 3 investor / 0 unclassified |

## Company / tenant identity (Step 2)

Canonical types:

- `AuthenticatedActorContext` — `actorId`, `actorType`, `companyId`, `authorisedProjectIds`, `roleIds`, `permissions`, `globalAccess`, `investorId`, `systemContext`
- `ProjectExecutionContext` / `SystemExecutionContext`

Resolution:

1. `User.companyId` when set (server-side, not JWT claim)
2. Else primary `Company.isPrimary`
3. `ActorContextService` validates active user + company existence (30s TTL cache)
4. `ProjectAccessService.assertCanAccessProject` checks **company boundary first**, then assignment
5. Global / Super Admin access is **company-wide**, not cross-company

## Service isolation inventory (Steps 3–4)

Source: `R-003B-service-isolation-inventory.csv`

| Status | Unique services | Method rows |
| --- | ---: | ---: |
| protected | 12 | 194 |
| partial | 25 | 129 |
| unprotected | 12 | 120 |

**Fully protected (service asserts + scoped filters):** journal, purchase-orders, purchase-requests, vendor-invoices, vendor-payments, customer-receipts, contractor-bills, contractor-payments, work-measurements, material-issues, stock-counts, project-dashboard.

**Partial:** boq, documents, bookings, contribution-receipts, goods-receipts, approvals, accounting-reports, construction-reports, finance-dashboard, projects, contractor-agreements, exports.

**Still unprotected at service layer (HTTP guard only):** chart-of-accounts, financial-year, accounting-period-closure, bank-reconciliation, petty-cash-*, cash-accounts, stock-ledger, stock-reorder, material-consumption, contractors, customers, booking-cancellations, payment-schedules, investors, investor-portal, project-participants, vendors, notifications.

Pattern used: `ProjectScopedDataHelper` — `assertProjectAccess`, `findOneForActor`, `buildScopedIdFilter`, `mergeAuthorisedProjectFilter`, `authorisedProjectMatchStage`.

## Reports / dashboards (Step 5)

| Report | Result |
| --- | --- |
| accounting-reports | PARTIAL — project assert on entry; aggregation match stages added where wired |
| construction-reports | PARTIAL |
| finance-dashboard | PARTIAL — list/summary scoped |
| project-dashboard | PASS (service asserts) |
| Full Project A ≠ Project B amount proof across all reports | PARTIAL (not every report has seeded amount isolation e2e) |

## Jobs / webhooks (Step 6)

Source: `R-003B-system-job-scope-inventory.csv`

- **8/8 cron schedulers** create explicit `SystemExecutionContext` and log `system=<jobName>`
- **4 BullMQ processors** still lack processor-level system context (partial)
- No inbound `@WebhookRoute` handlers found under `apps/backend/src`
- Jobs still iterate broadly in services; company-by-company hard isolation in workers is incomplete

## HTTP IDOR matrix (Step 7)

Source: `R-003B-idor-test-matrix.csv`

| Status | Rows |
| --- | ---: |
| covered | 69 |
| planned | 237 |

Suites:

- `test/r003b-http-idor.e2e-spec.ts` — seeded Company A Project A/B real HTTP
- `test/r003-idor-matrix.e2e-spec.ts` — company A/B unit-level matrix
- `test/project-access.e2e-spec.ts` — guard integration
- `src/modules/project-access/*.spec.ts` — service + helper bypass

Not every high-risk module has a fully seeded resource + all 18 scenarios.

## Service bypass (Step 8)

`project-scoped-data.helper.spec.ts` proves:

- missing actorId fails closed
- findOne never uses `_id` alone
- foreign scoped query → NotFound
- missing projectId on owned resource → Forbidden

## Observe mode (Step 11)

- Production default: `enforce`
- Observe soft-allow **cannot** bypass company boundary (`deny()` hard-denies cross-company)
- Removal plan: drop `observe` after staging metadata cleanup (see rollout plan)

## Why not Resolved

1. 12+ high-risk services still lack service-layer filters  
2. Full seeded HTTP IDOR across all modules incomplete (237 planned rows)  
3. BullMQ processors lack explicit system context  
4. Report amount isolation not proven for every report type  
5. Client project-creation Playwright E2E not added in this pass  

## Files created

- `docs/audit/remediation/R-003B-completion.md`
- `docs/audit/remediation/R-003B-service-isolation-inventory.csv`
- `docs/audit/remediation/R-003B-idor-test-matrix.csv`
- `docs/audit/remediation/R-003B-system-job-scope-inventory.csv`
- `apps/backend/test/r003b-http-idor.e2e-spec.ts`
- `apps/backend/src/modules/project-access/actor-context.service.ts`
- `apps/backend/src/modules/project-access/authenticated-actor.context.ts`
- `apps/backend/src/modules/project-access/project-scoped-data.helper.spec.ts`
- `apps/backend/src/config/project-access-enforcement.spec.ts`

## Next to reach Resolved

1. Wire remaining unprotected services with `ProjectScopedDataHelper`  
2. Expand seeded HTTP IDOR to every high-risk module + 18 scenarios  
3. Pass `SystemExecutionContext` into BullMQ processors; iterate company scope explicitly  
4. Seeded report amount isolation for TB/GL/ledgers/exports  
5. Project-creation Playwright/API E2E  
6. Re-run full command matrix; then set DEF-SEC-001 → Resolved  
