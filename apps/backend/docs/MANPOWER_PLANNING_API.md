# Manpower Planning & Shortfall Alerts API — Luxaria Developers ERP

Base path: `/api/v1/manpower-planning`  
Swagger tag: **Manpower Planning**

Daily contractor manpower plans, agreement/attendance/skill-mix comparison, and shortfall alerts.

## Permissions

| Permission | Usage |
|------------|--------|
| `manpower_plan.view` | List/get plans, compare |
| `manpower_plan.manage` | Create/update plans |
| `manpower_shortfall.view` | List alerts |
| `manpower_shortfall.acknowledge` | Evaluate + acknowledge alerts |

## Numbering

`NumberEntityType.MANPOWER_DAILY_PLAN` → `MPL-YYYY-######` (FY + project-scoped).

## Comparison layers

| Layer | Source |
|-------|--------|
| Agreement manpower | Active agreement `manpowerCommitment` |
| Daily planned manpower | `manpower_daily_plans` (falls back to agreement) |
| Actual attendance | Submitted/confirmed labour attendance Σ `workerCount` |
| Skill-wise commitment | Agreement `skillMix` |
| Actual skill mix | Attendance lines matched by category name/code |

`GET /manpower-planning/compare?projectId=&contractorId=&asOfDate=`

## Daily plans

`POST /manpower-planning/plans`

- Manual `skillMix` with optional `labourCategoryId` + `isCritical`
- Or `useAgreementDefaults: true` to copy agreement manpower + skill mix

Unique: one plan per `(projectId, contractorId, planDate)`.

## Alert rules

Evaluated for active agreements in date range (`POST .../shortfall-alerts/evaluate` or cron):

| Type | Rule |
|------|------|
| `below_80_two_consecutive_days` | Fill rate &lt; 80% for ≥ 2 consecutive days |
| `below_60_three_days` | Fill rate &lt; 60% for ≥ 3 consecutive days |
| `missing_critical_skill` | Critical planned/committed skill has 0 actual |
| `work_progress_behind_plan` | BOQ time-phased expected vs WM cumulative &lt; 90% |
| `no_attendance_submitted` | No submitted/confirmed attendance for the day |

Each alert includes:

- `shortfallPercent`
- `consecutiveDays`
- `expectedScheduleImpactDays`
- `recommendedEscalation` (`site_supervisor` / `project_manager` / `commercial_and_pm` / `director`)
- `skillGaps[]`

## Scheduler

| Env | Default |
|-----|---------|
| `MANPOWER_SHORTFALL_JOBS_ENABLED` | `true` |
| `MANPOWER_SHORTFALL_CRON` | `0 21 * * *` |

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/manpower-planning/plans` |
| `GET` | `/manpower-planning/plans` |
| `GET` | `/manpower-planning/plans/:id` |
| `PATCH` | `/manpower-planning/plans/:id` |
| `GET` | `/manpower-planning/compare` |
| `GET` | `/manpower-planning/shortfall-alerts` |
| `POST` | `/manpower-planning/shortfall-alerts/evaluate` |
| `POST` | `/manpower-planning/shortfall-alerts/:id/acknowledge` |
