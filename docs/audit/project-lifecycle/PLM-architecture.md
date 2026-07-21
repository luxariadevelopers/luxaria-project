# Project Lifecycle Management (Phase 2) — Architecture

## Status map

| From | Allowed next |
| --- | --- |
| Draft | Planning, Cancelled |
| Planning | Approval, On Hold, Cancelled, Draft |
| Approval | Active, Pre-Construction, Planning, On Hold, Cancelled |
| Pre-Construction | Active, Construction, On Hold, Cancelled |
| Construction | Active, On Hold, Completed, Cancelled |
| Active | On Hold, Completed, Cancelled, Construction |
| On Hold | Planning, Approval, Pre-Construction, Construction, Active (via `statusBeforeHold`) |
| Completed | Closed |
| Closed | Archived |
| Archived | Closed (restore only) |
| Cancelled | _(terminal)_ |

New projects default to **Draft**.

`statusBeforeHold` is set on suspend / transition into On Hold and cleared on resume.

## Permissions (reuse existing)

| Action | Permission |
| --- | --- |
| Suspend / resume / soft-delete / restore / settings | `project.update` |
| Close / archive | `project.close` |
| Clone | `project.create` |
| Team assign / revoke | `project_access.assign` |
| Structure / warehouses | `site.view` / `site.manage` |

No separate `project.archive` or `project.clone` catalog entries — documented on controller and in `permissions.catalog.ts`.

## Lifecycle APIs (`/api/v1/projects`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/:id/suspend` | → On Hold |
| POST | `/:id/resume` | restore `statusBeforeHold` or Active |
| POST | `/:id/close` | Completed → Closed |
| POST | `/:id/archive` | Closed → Archived |
| POST | `/:id/restore` | Archived → Closed |
| POST | `/:id/clone` | new Draft project |
| DELETE | `/:id` | soft-delete |
| POST | `/:id/restore-deleted` | undo soft-delete |
| PATCH | `/:id/settings` | module toggles |
| PATCH | `/:id/financial-config` | cost centres / tax defaults |

## Structure APIs

| Method | Path |
| --- | --- |
| GET | `/projects/:id/structure` |
| POST | `/projects/:id/structure` |
| GET | `/projects/:id/warehouses` |
| POST | `/projects/:id/warehouses` |
| PATCH | `/sites/:id` | `parentSiteId` with cycle + hierarchy checks |

Soft hierarchy: `site → phase → block → tower → floor`.

## Team APIs

| Method | Path |
| --- | --- |
| GET | `/projects/:id/team` |
| POST | `/projects/:id/team` |
| DELETE | `/projects/:id/team/:assignmentId` |

Creates/updates `ProjectAssignment.teamRole` (existing IAM assignment model). Optional `siteId` creates a `SiteAssignment`.  
`project_manager` → sets `Project.projectManager`.  
`director` → `$addToSet` on `assignedDirectors`.  
Invalidates `ActorContext` cache for the assignee.

## Dashboard

`GET /projects/:projectId/dashboard` adds optional counters:

- `pendingApprovalsCount` (open PRs)
- `pendingPoCount`
- `pendingGrnCount`
- `dprStatusSummary`
