# Site Operations dashboard (Micro Phase 026)

Management view of site activity for a selected project: `/dashboard/site`.

## Permission

Nest RBAC catalog exposes **`dashboard.view`** only. There is **no**
`dashboard.site.view` permission in `permissions.catalog.ts` — this page uses
`dashboard.view` plus `RequireProjectAccess` on the project dashboard route.

Supplemental sections additionally require module permissions when loaded:

| Section | Permission |
|---------|------------|
| DPR list / missing alerts | `dpr.view` |
| Attendance daily report | `attendance.view` |
| Goods receipts | `grn.create` |
| Petty-cash requirements | `petty_cash.view` |

Hiding the nav item is not enough: `RegistryRouteGuard` + `ProjectRequiredRoute`
and backend 403 handling still apply.

## APIs consumed

| Endpoint | Use |
|----------|-----|
| `GET /projects/:projectId/dashboard?date=` | Hub: labour, stock, cash, photos, critical alerts |
| `GET /daily-progress-reports?projectId&fromDate&toDate` | Today’s DPR rows |
| `GET /daily-progress-reports/missing-alerts?projectId=` | Missing-entry alerts |
| `GET /labour-attendance/daily-report?projectId&attendanceDate` | Attendance summary |
| `GET /goods-receipts?projectId=` | GRNs (filtered to as-of UTC day client-side) |
| `GET /petty-cash-requirements?projectId=` | Petty-cash requirement status |

## Date / timezone

Backend project dashboard and DPR normalize days to **UTC midnight**. The UI:

1. Sends `date` as `YYYY-MM-DD`
2. Displays `filters.date` from the dashboard response as the authoritative as-of day
3. Does not invent a project timezone (projects have no timezone field)

Missing-DPR alerts are raised by evening evaluation (`DPR_MISSING_CRON`, default
20:00). Until an alert exists, an empty DPR day is shown as **Awaiting cut-off**.

## Components

| Export | Role |
|--------|------|
| `SiteActivityCard` | Complete / pending / missing / awaiting cut-off tiles |
| `MissingEntryAlerts` | MISSING_DPR, MATERIAL_STOCK, LABOUR_SHORTFALL (+ detail alerts) |
| `TodaysActivityFeed` | DPR, attendance, GRN, photos for the as-of day |
| `SiteOperationsFilters` | Project + as-of date |

## Navigation

**Dashboard → Site Operations** (`showInNav: true`, overview group).
