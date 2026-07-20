# Contractor Running Bills API — Luxaria Developers ERP

Base path: `/api/v1/contractor-bills`  
Swagger tag: **Contractor Running Bills**

Running-account (RA) bill processing from contractor claim through payment.

## Permissions

| Permission | Usage |
|------------|--------|
| `running_bill.view` | List, get |
| `running_bill.create` | Create, update, submit claim, cancel |
| `running_bill.verify` | Engineer verification / reject |
| `running_bill.certify` | Project manager certification |
| `running_bill.finance_verify` | Finance verification |
| `running_bill.approve` | Director approval |
| `running_bill.post` | Post |
| `running_bill.pay` | Mark paid |

## Numbering

`NumberEntityType.CONTRACTOR_BILL` → `CB-YYYY-######` (FY + project-scoped).  
Also stores `raNumber` (RA-1, RA-2…) per agreement.

## Fields

| Field | Notes |
|-------|--------|
| `billNumber` | System CB number |
| `contractorId` / `projectId` / `agreementId` | Parties |
| `billingPeriod` | `{ from, to }` |
| `measurements` | Verified WM lines with rate/amount snapshots |
| `previousCertifiedValue` | Σ prior posted/paid RA current values |
| `currentCertifiedValue` | This bill gross |
| `cumulativeValue` | Previous + current |
| `advanceRecovery` | From agreement % / override, capped by remaining advance |
| `materialRecovery` | Manual |
| `retention` | Default agreement `%` of current value |
| `tds` / `penalty` / `otherDeductions` | Manual |
| `netPayable` | Current − all deductions |
| `paidAmount` | Cumulative payments applied |
| `remainingPayable` | `netPayable − paidAmount` (computed) |
| `journalEntryId` | Posted AP journal id (required when `status=posted`) |
| `invoiceDocument` | Document id / path (required to claim) |
| `status` | Workflow status |

## Workflow

```
Draft
  → Claimed                 (submit-claim)
  → Engineer Verified       (engineer-verify; ≠ claimer)
  → PM Certified            (pm-certify)
  → Finance Verified        (finance-verify)
  → Director Approved       (director-approve)
  → Posted                  (post — balanced journal Dr WIP / Cr payable+deductions)
  → Paid                    (mark-paid / contractor payment)
```

Post is idempotent (`ctr-bill-post:{id}` + `contractor-bill-journal:{id}`). Posted bills are immutable (only draft/rejected editable). Retention release accounting is not implemented in this module.

Reject from Claimed…Finance Verified → `rejected` (editable again as draft).

## Amount rules

- Only **verified** work measurements in the billing period.
- Rate from active agreement BOQ line (`agreedRate`).
- Measurement cannot appear on two open bills.
- Retention default = `agreement.retentionPercentage × currentCertifiedValue`.
- Advance recovery default = `percentPerBill × current`, capped by remaining advance.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/contractor-bills` |
| `GET` | `/contractor-bills` |
| `GET` | `/contractor-bills/:id` |
| `PATCH` | `/contractor-bills/:id` |
| `POST` | `/contractor-bills/:id/submit-claim` |
| `POST` | `/contractor-bills/:id/engineer-verify` |
| `POST` | `/contractor-bills/:id/pm-certify` |
| `POST` | `/contractor-bills/:id/finance-verify` |
| `POST` | `/contractor-bills/:id/director-approve` |
| `POST` | `/contractor-bills/:id/post` |
| `POST` | `/contractor-bills/:id/mark-paid` |
| `POST` | `/contractor-bills/:id/reject` |
| `POST` | `/contractor-bills/:id/cancel` |
