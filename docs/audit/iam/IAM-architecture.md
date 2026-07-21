# IAM Architecture

**Baseline:** `0922512804960e19439fb866a8354d0cc8ee5f8f`  
**Status:** Vertical slice delivered — Site Engineer provision + project/site scope

## Principles

1. **One permission engine** — `permissions.catalog.ts` + `PermissionsService` + `PermissionsGuard`
2. **One project isolation engine** — R-003 `ProjectAccessGuard` + `AuthenticatedActorContext`
3. **Sites extend project scope** — they never replace project assignment
4. **JWT stays thin** — identity only; effective access resolved server-side (30s actor cache TTL)
5. **Default deny** — permission without assignment denied; assignment without permission denied

## Decision formula

ALLOW only when all hold:

- user active
- linked employee active / on_leave / invited (if linked)
- company membership active
- effective permission (roles ∪ allows − denies)
- project assigned or explicit globalAccess
- site assigned when actor is site-scoped for that project and resource carries siteId
- access dates valid
- no explicit deny override
- resource company/project/site ownership matches
- portal user type permits action

## Precedence

1. inactive user/employee → deny  
2. explicit security restriction → deny  
3. explicit user deny override → deny  
4. role permissions → allow  
5. explicit user allow → allow (cannot expand project/site membership)  
6. project/site assignment restriction → deny if outside scope  

## Modules

| Module | Responsibility |
|--------|----------------|
| `auth` / `sessions` | Login, JWT, refresh, password reset, logout-all |
| `users` | Login accounts, roleIds, reportingManager |
| `employees` | Employee lifecycle, departments, designations, provision-site-engineer |
| `rbac` | Roles, catalog, permission overrides |
| `project-access` | Project assignments, actor context, R-003 guard |
| `sites` | Project sites + site assignments |

## AuthenticatedActorContext (extended)

Stable fields from R-003B plus:

- `userId`, `employeeId`, `departmentId`, `designationId`, `reportingManagerId`
- `authorisedSiteIds`
- existing: `companyId`, `roleIds`, `permissions`, `globalAccess`, `authorisedProjectIds`, …

## Site scope policy

- Active site assignments for a project → site-scoped for that project  
- Project assignment with **zero** site assignments → project-wide (backward compatible)  
- Provisioned Site Engineers always receive a site assignment  

## Cache TTL

Actor context cache: **30 seconds**. Revoked assignments take effect within that window (or immediately with `invalidate`).
