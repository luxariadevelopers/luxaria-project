# Investor portal — web module (Micro Phase 133)

Restricted investor-facing UI under `/investor/*` inside `apps/web`. Uses only
`investor-portal` backend endpoints — never staff `/investors` CRM APIs.

## Routes

| Path | Permission | APIs |
|---|---|---|
| `/investor/dashboard` | `investor_portal.view` | `GET /investor-portal/me`, `GET /investor-portal/projects` |
| `/investor/projects/:projectId` | `investor_portal.view` | `GET /investor-portal/projects/:projectId` (+ list for client authorisation) |

## Security

- Route guard: `InvestorPortalGuard` requires `investor_portal.view`.
- API client: `assertInvestorPortalApiPath` blocks `/investors/*` and non-portal paths.
- Project detail: client skips fetch when project id is absent from authorised list; backend 403 surfaces as access denied (horizontal access test).

## Structure

```
investor-portal/
  access.ts          # path guards + 403 helpers (unit tested)
  api.ts             # portal GET wrappers
  types.ts           # mirrors backend investor-portal.types.ts
  components/        # metric / summary cards
  guards/            # InvestorPortalGuard
  layouts/           # minimal InvestorLayout (phase 132 stub)
  pages/             # dashboard + project detail
```

## Tests

```bash
pnpm --filter @luxaria/web test:unit
```

## Types source of truth

`apps/backend/src/modules/investor-portal/investor-portal.types.ts`
