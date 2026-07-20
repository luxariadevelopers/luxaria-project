# Investor portal shell (Micro Phase 132)

Isolated investor-facing area under `/investor/*` in `@luxaria/web`. This is **not** the staff CRM at `/capital/investors` (future internal routes) — it uses a dedicated layout with no internal `Sidebar` or route registry groups.

## Routes

| Path | Purpose |
|---|---|
| `/investor/login` | Investor sign-in (redirects to portal after auth) |
| `/investor` | Shell root → `/investor/dashboard` |
| `/investor/dashboard` | Phase 132 stub: profile summary + project selector |
| `/investor/forbidden` | 403 when account lacks `investor_portal.view` |

## API (view-only in this phase)

| Method | Path | Permission |
|---|---|---|
| GET | `/api/v1/investor-portal/me` | `investor_portal.view` |
| GET | `/api/v1/investor-portal/projects` | `investor_portal.view` |

Manage endpoints (`POST /reports`, profit allocation) are **not** wired in the shell.

## Guards

- `InvestorPortalGuard` — authenticated + `investor_portal.view`
- `InternalAppGuard` — blocks investor-only sessions from staff ERP routes (`/`, `/users`, `/projects`, …)
- Staff `/login` redirects investor-only users to `/investor/dashboard`

## Local dev

```bash
pnpm --filter @luxaria/web dev
# Investor login: http://localhost:9001/investor/login
```

## Tests

```bash
pnpm --filter @luxaria/web test:unit   # vitest — session + route isolation
pnpm --filter @luxaria/web typecheck
pnpm --filter @luxaria/web lint
```

## Merge snippets

After `/apply-worktree`, ensure these touch points exist on your branch:

1. `apps/web/src/routes/index.tsx` — investor + internal guard route trees
2. `apps/web/src/auth/ProtectedRoute.tsx` — investor login redirect + session split
3. `apps/web/src/api/client.ts` — 401 redirect respects `/investor/*`
4. `docs/ui-api-matrix.md` — investor portal UI row marked **implemented**
