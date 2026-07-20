# Project Access API — Luxaria Developers ERP

Base path: `/api/v1/project-access`  
Auth: Bearer access token required  
Swagger tag: **Project Access**

## Rules

1. Users may access a project only via an **effective assignment**, unless they have Super Admin RBAC bypass.
2. **Directors are not hard-coded** for all-project access. Grant `globalAccess: true` on an assignment record.
3. Investors, site engineers, and purchase users receive **selected `projectId` assignments** (participate / assigned sites / selected projects).
4. Effective window: `status=active` AND `accessStartDate <= now` AND (`accessEndDate` null OR `>= now`).
5. Denied attempts are written to `unauthorized_project_access_attempts`.
6. `User.assignedProjects` is a denormalized cache of effective non-global project ids.

## Assignment fields

| Field | Description |
|-------|-------------|
| `userId` | User receiving access |
| `projectId` | Project (required unless `globalAccess`) |
| `globalAccess` | All-project access for the window |
| `accessStartDate` | Inclusive start |
| `accessEndDate` | Inclusive end; null = open-ended |
| `status` | `active` \| `inactive` \| `expired` |

## Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/project-access/me` | authenticated | Current user’s accessible project ids + global flag |
| GET | `/project-access/assignments` | `project_access.view` | List assignments |
| POST | `/project-access/assignments` | `project_access.assign` | Create assignment (selected or global) |
| PATCH | `/project-access/assignments/:id` | `project_access.manage` | Update dates / status / notes |
| POST | `/project-access/assignments/:id/activate` | `project_access.manage` | Activate |
| POST | `/project-access/assignments/:id/deactivate` | `project_access.manage` | Deactivate |
| GET | `/project-access/unauthorized-attempts` | `project_access.audit_view` | Audit denied attempts |
| GET | `/project-access/check/:projectId` | authenticated + project access | Read check |
| POST | `/project-access/check/:projectId/create` | authenticated + project access | Create check |
| POST | `/project-access/check/:projectId/update` | authenticated + project access | Update check |
| POST | `/project-access/check/:projectId/approve` | authenticated + project access | Approve check |

`POST /users/:id/projects` also creates/updates assignment records.

## Guard / decorator

```ts
@RequireProjectAccess({
  source: 'params', // or body | query
  key: 'projectId',
  operation: 'read' | 'create' | 'update' | 'approve',
})
```

Apply on project-scoped create / read / update / approval routes in future modules. Global `ProjectAccessGuard` enforces the decorator when present.

## Example — Director all-project access

```json
POST /api/v1/project-access/assignments
{
  "userId": "<directorUserId>",
  "globalAccess": true,
  "accessStartDate": "2026-04-01",
  "accessEndDate": null,
  "notes": "Board oversight FY26"
}
```

## Example — Site engineer assigned sites

```json
{
  "userId": "<engineerUserId>",
  "projectId": "<projectId>",
  "globalAccess": false,
  "accessStartDate": "2026-01-15",
  "accessEndDate": "2026-12-31"
}
```
