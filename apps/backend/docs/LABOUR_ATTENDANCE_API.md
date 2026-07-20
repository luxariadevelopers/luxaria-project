# Labour Attendance API — Luxaria Developers ERP

Base path: `/api/v1/labour-attendance`  
Swagger tag: **Labour Attendance**

Contractor labour attendance sheets for site headcount, overtime, GPS, and supervisor confirmation.

## Permissions

| Permission | Usage |
|------------|--------|
| `attendance.view` | List, get, daily report |
| `attendance.create` | Create, update, submit |
| `attendance.confirm` | Supervisor confirmation |

## Numbering

`NumberEntityType.LABOUR_ATTENDANCE` → `LAT-YYYY-######` (financial year + project-scoped).

## Capture fields

| Field | Notes |
|-------|--------|
| `projectId` | Project |
| `contractorId` | Contractor |
| `attendanceDate` | UTC midnight calendar day |
| `lines[].labourCategoryId` | Labour category |
| `lines[].workerCount` / `workers` | Group headcount and/or named workers |
| `lines[].workers[].checkIn` / `checkOut` | Individual times |
| `lines[].overtimeHours` / worker OT | Overtime hours |
| `workLocation` | Site location label |
| `groupPhotoDocumentIds` | Group photo document IDs (S3 Documents) |
| `latitude` / `longitude` | GPS (required on submit) |
| `remarks` | Free text |
| `supervisorConfirmed` | Set on confirm |

## Attendance modes

| `entryMode` | Rules |
|-------------|--------|
| `group` | `workerCount ≥ 1`; optional named `workers` (length ≤ count) |
| `individual` | At least one `worker`; `workerCount` = workers length |

A sheet may mix group and individual lines (different categories).

## Duplicate detection

1. **Sheet** — unique active `(projectId, contractorId, attendanceDate)`.
2. **Category** — same labour category cannot appear twice on one sheet.
3. **Worker** — duplicate `workerCode` or normalized `workerName` on one sheet is rejected.

## Offline mobile

1. Upload group photos via Documents S3 (`group_photo_0` …).
2. `POST /labour-attendance` with header `Idempotency-Key`.
3. Optional body: `submit: true`, `clientDeviceId`, `offlineCapturedAt`, `attachments`.

Idempotency scope: `labour_attendance`.

## Workflow

`draft` → `submitted` → `confirmed`

- Submit requires GPS + at least one group photo + ≥1 line.
- Confirm sets `supervisorConfirmed`, `confirmedBy`, `confirmedAt`.

## Daily report

`GET /labour-attendance/daily-report?projectId=&attendanceDate=&contractorId?`

Returns sheet list with per-category totals, worker/OT aggregates, and confirmation counts.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/labour-attendance` |
| `GET` | `/labour-attendance` |
| `GET` | `/labour-attendance/daily-report` |
| `GET` | `/labour-attendance/:id` |
| `PATCH` | `/labour-attendance/:id` |
| `POST` | `/labour-attendance/:id/submit` |
| `POST` | `/labour-attendance/:id/confirm` |
