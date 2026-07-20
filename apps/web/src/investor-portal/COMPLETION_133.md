# Micro Phase 133 — Completion report

**Phase:** Investor dashboard and project detail summaries  
**Layer:** Investor Web (`apps/web/src/investor-portal`)  
**Date:** 2026-07-20

## Objective

Show only authorised project investment summaries for linked investors.

## Delivered

### Routes

- `/investor/dashboard` — portfolio totals + per-project summary cards
- `/investor/projects/:projectId` — commitment, contribution, profit share, progress, utilisation
- `/investor` → redirects to dashboard
- Minimal `InvestorLayout` + `InvestorPortalGuard` (shell stub; full isolation is Phase 132)

### APIs consumed (only)

| Method | Path | Permission |
|---|---|---|
| GET | `/investor-portal/me` | `investor_portal.view` |
| GET | `/investor-portal/projects` | `investor_portal.view` |
| GET | `/investor-portal/projects/:projectId` | `investor_portal.view` |

Staff `/investors/*` endpoints are **not** called. `assertInvestorPortalApiPath` enforces this at the client.

### Components

- `CommitmentContributionCards`, `ProfitShareCard`, `ProgressCard`, `UtilisationCard`
- `ProjectSummaryCard`, `QueryStatePanel`, `MetricCard`

### Security / horizontal access

- `InvestorPortalGuard` — route-level `investor_portal.view`
- Project detail skips API call when `projectId` ∉ authorised list from `GET /projects`
- Backend 403 handled via `isProjectAccessDenied` + user-facing denial panel
- Unit tests in `access.test.ts` for path blocking and 403 helpers

### Documentation

- `apps/web/src/investor-portal/README.md`
- `docs/ui-api-matrix.md` updated (investor portal UI + API calls)

## Verification

```bash
pnpm --filter @luxaria/web typecheck
pnpm --filter @luxaria/web lint
pnpm --filter @luxaria/web test:unit
```

## Out of scope (later phases)

- Phase 132: full portal isolation, dedicated login, internal route blocking
- Phase 134: documents / statements UI (`agreements`, `receipts`, `reports` from project detail)

## Merge-back

Use `/apply-worktree` from the parent chat to merge this worktree into the main workspace.
