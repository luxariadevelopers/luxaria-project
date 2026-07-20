# Project context (Micro Phase 010)

Global project selection for the web portal.

## APIs

| Method | Path | Permission | Role |
|---|---|---|---|
| `GET` | `/project-access/me` | authenticated | `{ globalAccess, projectIds }` |
| `GET` | `/projects` | `project.view` | Access-scoped project rows for the selector |

Clients still send `X-Project-Id` when a project is selected (see `api/client.ts`). Backend project guards continue to enforce access from JWT + params/body/query.

## Behaviour

- Persists selection in `localStorage` (`luxaria.selectedProjectId`).
- Rejects stale / unassigned / `Closed` / `Cancelled` selections via `@luxaria/shared-types` `resolveProjectSelection`.
- Users only see assigned projects unless `globalAccess` is true.
- Switching project invalidates React Query caches except `auth`, `project-access`, and `projects/selector`.
- `ProjectRequiredRoute` blocks project-scoped pages until a valid project is active.
- `NoProjectAccessPage` when the user has no assignments and no global access.

## UI

- Header: `ProjectBadge` + `ProjectSelector`
- Route wrapper: `auth/ProjectRequiredRoute.tsx`
