# Daily Progress Reports API — Luxaria Developers ERP

Base path: `/api/v1/daily-progress-reports`  
Swagger tag: **Daily Progress Reports**

## Workflow

```
Draft → Submitted → Reviewed
         ↘ Reopened → Submitted → Reviewed
```

## Capture fields

project, date, weather, staff present, labour count, work performed, BOQ quantities completed, materials received/issued, equipment used, delays, safety/quality issues, decisions required, tomorrow plan, photos, videos, site cash balance.

## Rules

1. **One DPR per project per date** — unique index; reopen to edit after submit/review.
2. **Offline mobile** — send `Idempotency-Key` header; optional `submit: true`, `clientDeviceId`, `offlineCapturedAt`.
3. **Missing-DPR alerts** — cron `DPR_MISSING_CRON` (default `0 20 * * *`) for Construction / Pre-Construction projects.
4. **PDF** — generated on submit and stored via Documents (`documentType: dpr_pdf`).

## Permissions

| Permission | Usage |
|------------|--------|
| `dpr.view` | List/get, missing alerts |
| `dpr.create` | Create, update, submit |
| `dpr.review` | Review, reopen, regenerate PDF, evaluate alerts |

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/daily-progress-reports` (+ `Idempotency-Key`) |
| `GET` | `/daily-progress-reports` |
| `GET` | `/daily-progress-reports/:id` |
| `PATCH` | `/daily-progress-reports/:id` |
| `POST` | `/daily-progress-reports/:id/submit` |
| `POST` | `/daily-progress-reports/:id/review` |
| `POST` | `/daily-progress-reports/:id/reopen` |
| `POST` | `/daily-progress-reports/:id/regenerate-pdf` |
| `GET` | `/daily-progress-reports/missing-alerts` |
| `POST` | `/daily-progress-reports/missing-alerts/evaluate` |
| `POST` | `/daily-progress-reports/missing-alerts/:id/acknowledge` |

## Env

| Variable | Default |
|----------|---------|
| `DPR_MISSING_JOBS_ENABLED` | `true` |
| `DPR_MISSING_CRON` | `0 20 * * *` |

## Numbering

`DPR-YYYY-######` (project-scoped)
