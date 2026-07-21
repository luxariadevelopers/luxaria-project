# Site Execution — Labour Attendance Integration (Phase 5 / W3)

## Permissions

**No catalog additions.** Reuse existing:

| Permission | Usage |
|------------|--------|
| `attendance.view` | List, get, daily-report, daily-deployment |
| `attendance.create` | Create, update draft, submit |
| `attendance.confirm` | Supervisor confirm (Submitted → Confirmed) |

Do **not** invent `labour.deploy.*` or duplicate attendance permissions.

## Schema extensions (W3)

| Field | Notes |
|-------|--------|
| `siteId` | Optional; when set, must belong to `projectId`; `SiteAccessService.assertSiteAccessIfScoped` on write/report |
| `shift` | `morning \| afternoon \| night \| general` (default `general`) |
| `dprId` | Optional soft link to Daily Progress Report for rollup |
| `contractorId` | Already required; reuse contractor master |
| Line `labourCategoryId` | Already required; categories carry skill level |
| Worker `checkIn` / `checkOut` | Canonical timestamps; API also accepts/returns `checkInAt` / `checkOutAt` aliases |
| Worker / line `overtimeHours` | Validated ≥ 0; worker ≤ 16h, line ≤ 160h |

Uniqueness (active rows): `(projectId, contractorId, attendanceDate, siteId, shift)`.

## Categories

`LabourSkillLevel` already includes `skilled`, `semi_skilled`, `unskilled`.

Seed extended with generic buckets (idempotent by name):

- Skilled Labour
- Semi-skilled Labour
- Unskilled Labour

Plus existing trade categories (Mason, Helper, …). Re-run labour-categories seed if needed.

## Endpoints for DPR rollup

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/labour-attendance/daily-report?projectId&attendanceDate&siteId?&shift?&contractorId?` | `attendance.view` |
| `GET` | `/labour-attendance/daily-deployment?...` (same query) | `attendance.view` |

`daily-deployment` is the preferred DPR labour rollup alias; payload matches daily-report.

List also accepts `siteId`, `shift`, `dprId` filters.

## Module wiring

`LabourAttendanceModule` imports `SitesModule` for site resolve + ACL.  
**Do not** edit `app.module.ts` / RBAC catalog / role seed for this wave.

## Downstream (later waves)

On DPR approve/lock, freeze confirmed deployment counts from these sheets via `dprId` / daily-deployment query — payroll/billing hooks are out of W3 scope.
