# R-003 completion — Default-deny project isolation (DEF-SEC-001)

**Status:** PARTIAL (extended by R-003B — still not Resolved)  
**Date:** 2026-07-20  
**R-003B:** See `docs/audit/remediation/R-003B-completion.md`  
**R-004+ / accounting work:** Not implemented

## Root cause

`ProjectAccessGuard` was registered globally but returned `true` whenever `@RequireProjectAccess` metadata was absent. Only ~12 handlers opted in. Permission checks alone therefore authorised cross-project IDOR via path/query/body resource IDs.

## Access model implemented

Canonical decision path: `ProjectAccessService.assertCanAccessProject({ actor, projectId, action, resourceType, resourceId })`.

| Actor | Rule |
| --- | --- |
| Super Admin (`bypassPermissions`) | All projects |
| Staff with `globalAccess` assignment | All projects (within effective date/status window) |
| Staff with project assignment | Assigned project(s) only |
| Investor (portal) | Approved `outside_investor` participation only (`InvestorParticipationService`) |
| System jobs | Explicit `SystemExecutionContext` (no fake Super Admin user) |
| Directors | **Not** automatic all-project access unless `globalAccess` assignment exists |

Company isolation: single-tenant ERP; cross-company is enforced as foreign-project denial via assignments. Resources with `companyId` are ownership-checked where registered.

## Default-deny mechanism

1. Every authenticated route must declare scope metadata.
2. Undecorated authenticated routes → **403 Access denied** (+ audit).
3. Decorators: `@ProjectScoped`, `@GlobalScope`, `@InvestorScoped`, `@SystemInternal`, `@WebhookRoute`, `@Public` (also sets scope `public`).
4. Legacy `@RequireProjectAccess` also applies `@ProjectScoped`.
5. `PROJECT_ACCESS_ENFORCEMENT=enforce|observe` (default **enforce**).

## Route classification totals

From `node scripts/r003-scan-route-scopes.mjs` (621 handlers / 68 controllers):

| Scope | Count |
| --- | ---: |
| project | 401 |
| global | 209 |
| public | 8 |
| investor | 3 |
| unclassified | 0 |

Inventory: `docs/audit/remediation/R-003-project-route-inventory.csv`.

## Project resolution mechanisms

Cross-validated sources (all must agree when multiple present):

1. Path `projectId` / resource ownership project  
2. Query `projectId`  
3. Body `projectId`  
4. Header `X-Project-Id`  
5. Resource-by-ID via `ResourceOwnershipService` + registry  

Mismatch → deny. Header never overrides resource ownership.

## Service-level protection summary

| Module | Protection |
| --- | --- |
| Approvals | Existing `assertCanAccessProject` on mutations/reads |
| Projects / finance dashboard | Existing access scoping |
| Purchase orders | Create/list/get/mutate assert + authorised project filter |
| Journals | Create/list/get/mutate assert + authorised project filter |
| Documents | Upload/download/replace/archive/list/get assert + filter |
| Other project modules | HTTP guard + resource ownership registry (defence in depth pending deeper service filters) |

Helper: `ProjectScopedDataHelper`.

## Company isolation verdict

PARTIAL → improved in R-003B: `AuthUser.companyId` resolved server-side; `assertProjectCompanyBoundary` runs before assignment checks; global access is company-wide. Remaining gaps: some services still lack company/project query filters.

## Investor isolation verdict

PASS for portal routes: `@InvestorScoped` + participation service; staff manage routes use `@ProjectScoped`. Client path assert + selection guard added.

## Document/file security verdict

PASS for documents module: project assert before metadata, download URL, upload, replace, archive. Signed URL generation remains post-authorisation with existing short expiry config.

## Report/export security verdict

PARTIAL: finance/project dashboards use project access; class-level `@ProjectScoped({ mode: 'filter' })` on report controllers; multi-project arrays should call `assertCanAccessProjects` where clients send lists (follow-up for remaining report services).

## Approval security verdict

PASS (pre-existing service asserts retained; guard also project-scoped).

## Background job/webhook verdict

PARTIAL: jobs remain system-scoped (no user guard). `SystemExecutionContext` helper added for explicit context; no inbound project webhook trusts client `projectId`. Ops alert webhook unchanged.

## Web compatibility result

PASS: `X-Project-Id` from active project; cleared on logout; cache invalidation on switch; investor paths omit staff header.

## Mobile compatibility result

PASS: header set from selection; offline sync header preserved when already set; stale selection cleared; switch invalidates caches.

## Offline queue isolation result

PASS: interceptor no longer overwrites txn `X-Project-Id` after project switch.

## IDOR test counts/results

| Suite | Result |
| --- | --- |
| Guard unit (default-deny, header, mismatch, resource, unclassified) | Implemented |
| Project access service unit | Existing + generic Access denied |
| Route scope static scanner | 0 violations / 621 handlers |
| Guard e2e (`project-access.e2e-spec.ts`) | Header + unclassified deny |
| IDOR matrix (`r003-idor-matrix.e2e-spec.ts`) | A vs B allow/deny, globalAccess, inactive, filter helper |
| Full HTTP matrix for every high-risk module with seeded docs | Not fully executed in this pass |

## Cross-company test result

PARTIAL — modelled as foreign-project denial (no multi-company AuthUser fixture).

## Performance impact

Access check uses existing assignment query per assert; list helpers use `$in` authorised ids. No full project catalogue load required for single-project asserts. Optional observe logging only when configured.

## Files created

- `apps/backend/src/modules/project-access/decorators/route-scope.decorator.ts`
- `apps/backend/src/modules/project-access/resource-ownership.registry.ts`
- `apps/backend/src/modules/project-access/resource-ownership.service.ts`
- `apps/backend/src/modules/project-access/investor-participation.service.ts`
- `apps/backend/src/modules/project-access/project-scoped-data.helper.ts`
- `apps/backend/src/modules/project-access/system-execution-context.ts`
- `apps/backend/src/modules/project-access/route-scope.static.spec.ts`
- `apps/backend/test/r003-idor-matrix.e2e-spec.ts`
- `scripts/r003-apply-route-scopes.mjs`
- `scripts/r003-scan-route-scopes.mjs`
- `docs/audit/remediation/R-003-project-route-inventory.csv`
- `docs/audit/remediation/R-003-rollout-plan.md`
- `docs/audit/remediation/R-003-completion.md`

## Files modified (primary)

- `project-access.guard.ts`, `project-access.service.ts`, `project-access.module.ts`, `require-project-access.decorator.ts`, `index.ts`
- All 68 controllers (scope classification)
- `documents/*`, `purchase-orders/*`, `journal/*` (service-level)
- `main.ts` (CORS `X-Project-Id`)
- `configuration.ts` (`projectAccessEnforcement`)
- `public.decorator.ts`
- Web/mobile/investor API clients + project contexts
- `docs/audit/54-master-defect-register.csv` (DEF-SEC-001)

## Commands / results

See final response after test run.

## Rollout plan

See `R-003-rollout-plan.md`.

## Known limitations

1. Not every high-risk service yet injects `ProjectScopedDataHelper` (guard + ownership registry cover HTTP).
2. Full seeded HTTP IDOR suite across all modules not completed in this pass.
3. Company tenancy is project-assignment based (AuthUser has no `companyId`).
4. Journal rows with `projectId: null` are hidden from non-global users by authorised `$in` filters (intentional).
5. `observe` mode must remain temporary.

## DEF-SEC-001

**Partially Resolved** — default-deny + full classification + core IDOR/service hardening landed; remaining service-level depth and full HTTP matrix tracked as follow-up before Resolved.
