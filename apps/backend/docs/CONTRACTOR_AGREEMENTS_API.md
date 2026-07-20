# Contractor Agreements API — Luxaria Developers ERP

Base path: `/api/v1/contractor-agreements`  
Swagger tag: **Contractor Agreements**

Versioned commercial agreements between Luxaria and contractors for a project.

## Permissions

| Permission | Usage |
|------------|--------|
| `contractor_agreement.view` | List, get, versions, expiry alerts |
| `contractor_agreement.manage` | Create, update, amend, submit, terminate, evaluate/ack alerts |
| `contractor_agreement.approve` | Approve / reject via Approvals engine |

## Numbering

`NumberEntityType.CONTRACTOR_AGREEMENT` → `CA-YYYY-######` (FY + project-scoped).  
`agreementNumber` is **stable across versions**; `version` increments on amend.

## Status workflow

```
Draft → Pending approval → Active → Superseded (by later approved amendment)
                       ↘ Rejected (edit → Draft)
Active → Terminated
Active → Expired (expiry job when endDate passed)
```

## Version amendments

1. Only `active` agreements can be amended.
2. `POST /:id/amend` clones commercial fields into a new draft (`version + 1`, same `agreementNumber`, `supersedesId` set).
3. One open draft/pending/rejected version per agreement number (unique index).
4. On final approval, prior active version becomes `superseded`.

## Approval workflow

Seeded ApprovalsModule workflow:

- `module`: `contractors`
- `entityType`: `contractor_agreement`
- Steps: Project Manager → Finance Manager

`POST /:id/submit` creates an approval request (`amount` = agreed rates total).  
`POST /:id/approve` / `reject` delegate to ApprovalsService; activation happens when the request is fully `approved`.

## Expiry alerts

Daily cron (`CONTRACTOR_AGREEMENT_EXPIRY_CRON`, default `0 7 * * *`):

| Alert type | Condition |
|------------|-----------|
| `expiring_soon` | days remaining ≤ `CONTRACTOR_AGREEMENT_EXPIRY_WARNING_DAYS` (default 30) |
| `expiring_critical` | days remaining ≤ 7 |
| `expired` | days remaining < 0 (also marks agreement `expired`) |

Unique per `(agreementId, alertType)`. Acknowledge via API.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/contractor-agreements` |
| `GET` | `/contractor-agreements` |
| `GET` | `/contractor-agreements/:id` |
| `PATCH` | `/contractor-agreements/:id` |
| `POST` | `/contractor-agreements/:id/amend` |
| `POST` | `/contractor-agreements/:id/submit` |
| `POST` | `/contractor-agreements/:id/approve` |
| `POST` | `/contractor-agreements/:id/reject` |
| `POST` | `/contractor-agreements/:id/terminate` |
| `GET` | `/contractor-agreements/by-number/:agreementNumber/versions` |
| `GET` | `/contractor-agreements/expiry-alerts` |
| `POST` | `/contractor-agreements/expiry-alerts/evaluate` |
| `POST` | `/contractor-agreements/expiry-alerts/:alertId/acknowledge` |

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `CONTRACTOR_AGREEMENT_EXPIRY_JOBS_ENABLED` | `true` | Enable cron |
| `CONTRACTOR_AGREEMENT_EXPIRY_CRON` | `0 7 * * *` | Schedule |
| `CONTRACTOR_AGREEMENT_EXPIRY_WARNING_DAYS` | `30` | First warning window |
