# IAM Current-State Inventory

**Baseline:** `0922512804960e19439fb866a8354d0cc8ee5f8f` (`origin/main`)  
**Date:** 2026-07-21  
**Scope:** Auth, User/Staff, RBAC, Project/Site access, Web/Mobile admin surfaces

## Verdict

Luxaria already has production JWT auth, role-based RBAC with a seeded **Site Engineer** role, and R-003 default-deny **project** isolation via `AuthenticatedActorContext` + `ProjectAccessGuard`. There is **no** separate Employee/Department/Designation/Site master, **no** user permission overrides, and **no** site-level assignment. HR fields are free-text on `User`. This phase extends and consolidates those modules — it must not introduce a second permission system.

## Existing models

| Concept | Location | Notes |
|---------|----------|-------|
| User | `apps/backend/src/modules/users/schemas/user.schema.ts` | Login identity; free-text `employeeId`, `department`, `designation`; `roleIds`; `reportingManager`; `companyId` |
| Role | `apps/backend/src/modules/rbac/schemas/role.schema.ts` | `permissions[]`, `bypassPermissions`, `isSystem` |
| Permission catalog | `apps/backend/src/modules/rbac/permissions.catalog.ts` | `module.action` codes |
| ProjectAssignment | `apps/backend/src/modules/project-access/schemas/project-assignment.schema.ts` | user+project or globalAccess; date window; status |
| AuthenticatedActorContext | `apps/backend/src/modules/project-access/authenticated-actor.context.ts` | actor, company, roles, permissions, project ids |
| RefreshToken / PasswordReset | `apps/backend/src/modules/sessions/` | Device sessions, logout-all |
| AuditLog | `apps/backend/src/modules/audit-log/` | Auth events present; weak RBAC mutation audit |
| Investor / Director | Linked via `userId` + portal roles | Separate from staff RBAC |

## Duplicate / overlapping concepts

1. `User.assignedProjects` **and** `project_assignments` collection  
2. Role assign via `/users/:id/roles` **and** `/rbac/users/:userId/roles`  
3. Free-text department/designation vs expected org masters  
4. Frontend permission catalogs vs backend `PERMISSIONS` (not shared package)  
5. Project as “site” (geo on Project) vs free-text `location` / `workLocation` on operational docs  

## Missing relationships (pre-implementation)

- Employee entity linked 1:1 (optional) to User  
- Department / Designation masters with company scope  
- Site master under Project + SiteAssignment  
- User permission allow/deny overrides with expiry / project-site scope  
- Delegation / temporary access entities  
- `authorisedSiteIds` on actor context  
- Admin UI under `/administration/employees`  

## Current user types

- Internal staff: distinguished by **roles** (SUPER_ADMIN, DIRECTOR, SITE_ENGINEER, …)  
- Investor: `INVESTOR` role + `investor_portal.*` + Investor.userId  
- No first-class `actorType` enum for contractor/vendor/customer portals  

## Security risks (pre-implementation)

1. Site Engineer with project assignment can operate across all free-text locations on that project  
2. Permission alone can still be insufficient without assignment (R-003) — preserve this  
3. Weak audit on role/permission/assignment mutations  
4. Mobile deep links unevenly gated; offline queue does not store permission codes  
5. Super Admin `bypassPermissions` must remain explicit and company-bound  

## Migration needs

- Non-destructive: keep User free-text fields; add optional FKs (`employeeRef`, `departmentId`, `designationId`)  
- Backfill employees from users with `employeeId` string (optional dry-run script later)  
- Preserve existing `project_assignments` and role ObjectIds  
- Site master is additive; free-text location remains for legacy records  

## Web admin today

| Path | Status |
|------|--------|
| `/users` | Production user CRUD |
| `/administration/roles` | Production RBAC |
| `/administration/audit-logs` | Production |
| `/projects/:projectId/access` | Project assignment UI |
| `/administration/employees` | **Missing** |
| Departments / Designations / Site Access / Delegations | **Missing** |

## Mobile today

- Bootstrap: `/auth/me` + `/rbac/me/permissions` + project access  
- Project selector: assigned projects only  
- Site selector: **none**  
- Offline: stores project/owner, not site/permission checksum  

## Decision: consolidation approach

1. Add `employees`, `departments`, `designations`, `sites` modules under backend  
2. Extend `project-access` with site assignments + actor site ids  
3. Extend `rbac` with permission overrides (not a new matrix engine)  
4. Keep Permission catalog + PermissionsGuard + ProjectAccessGuard as sole enforcement path  
5. First vertical slice: create Site Engineer employee + login + role + project + site + restricted access  
