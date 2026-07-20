# RBAC API — Luxaria Developers ERP

Base path: `/api/v1/rbac`  
Auth: Bearer access token required  
Swagger tag: **RBAC**

## Rules

1. **Deny by default** — when a route declares `@RequirePermissions(...)`, the caller must hold **all** listed permissions (`module.action`).
2. **Super Admin bypass** — only roles with `bypassPermissions: true` (seeded Super Admin) skip checks. Access is never hard-coded by title (e.g. Director).
3. Inactive roles do not contribute permissions.
4. System roles are seeded on API boot and refreshed from seed definitions.
5. Custom role codes use numbering `ROL-000001` when `code` is omitted.

## Initial roles

Super Admin, Managing Director, Director, Finance Director, Finance Manager, Accountant, Project Manager, Purchase Manager, Purchase Executive, Site Engineer, Site Supervisor, Storekeeper, Sales Manager, Investor, Auditor, Read Only.

## Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/rbac/permissions` | `permission.view` | Canonical permission catalog |
| GET | `/rbac/me/permissions` | *(any authenticated)* | Effective permissions for current user |
| GET | `/rbac/roles` | `role.view` | List / search roles |
| GET | `/rbac/roles/:id` | `role.view` | Role details |
| POST | `/rbac/roles` | `role.create` | Create role |
| PATCH | `/rbac/roles/:id` | `role.update` | Update role |
| POST | `/rbac/roles/:id/permissions` | `role.update` | Replace role permissions |
| POST | `/rbac/roles/:id/clone` | `role.create` | Clone role (bypass never copied) |
| POST | `/rbac/roles/:id/activate` | `role.update` | Activate |
| POST | `/rbac/roles/:id/deactivate` | `role.update` | Deactivate (blocked for bypass roles) |
| POST | `/rbac/users/:userId/roles` | `role.assign` | Assign roles to user (full replace) |

User management also exposes `POST /users/:id/roles` (`user.assign_role`).

## Decorators / guard

- `@RequirePermissions('project.create', 'project.view')` — all required
- `@SkipPermissions()` — authenticated but no permission check (e.g. `/rbac/me/permissions`)
- Global `PermissionsGuard` after JWT auth

## Current user permissions response

```json
{
  "success": true,
  "message": "Current user permissions fetched successfully",
  "data": {
    "userId": "...",
    "roleIds": ["..."],
    "roleCodes": ["PROJECT_MANAGER"],
    "permissions": ["project.view", "dpr.create"],
    "bypassPermissions": false
  },
  "meta": {}
}
```

## Bootstrap

`POST /auth/bootstrap-admin` assigns the seeded `SUPER_ADMIN` role so the first user can manage RBAC and users.
