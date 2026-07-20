# Contractor Payments API — Luxaria Developers ERP

Base path: `/api/v1/contractor-payments`  
Swagger tag: **Contractor Payments**

Pay posted contractor running-account bills with partial settlement, withholdings, proof, and GL posting.

## Permissions

| Permission | Usage |
|------------|--------|
| `payment.view` | List, get |
| `payment.release` | Create, update, submit, release, cancel |
| `payment.approve` | Approve, verify, post |

## Numbering

`NumberEntityType.CONTRACTOR_PAYMENT` → `CP-YYYY-######` (FY + project-scoped).

## Features

- Select one or more **posted** running bills (`allocations[]`)
- Partial payment (remaining tracked via bill `paidAmount`)
- Payment-level **retention**, **advance recovery**, **TDS**, **penalty**
- `paymentProof` + `transactionReference` (unique per bank)
- Accounting post on verify→post

## Workflow

```
Draft → Approval → Released → Verified → Posted
```

`release` requires `paymentProof` and `transactionReference`.

## Amounts

| Field | Meaning |
|-------|---------|
| `amount` | Gross AP reduction (= Σ allocations) |
| `tds` / `retention` / `advanceRecovery` / `penalty` | Withholdings from bank outflow |
| `bankAmount` | `amount − tds − retention − advanceRecovery − penalty` |

Bill remaining payable = `netPayable − paidAmount` (minus open payment reservations).

## Accounting (on post)

| Side | Account |
|------|---------|
| Debit | Contractor Payable (`partyType: contractor`) |
| Credit | TDS Payable (if TDS > 0) |
| Credit | Retention Payable (if retention > 0) |
| Credit | Other Income (advance recovery + penalty) |
| Credit | Bank (`bankAccount.ledgerAccountId`) for `bankAmount` |

Allocations update bill `paidAmount`; bill status → `paid` when remaining ≈ 0.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/contractor-payments` |
| `GET` | `/contractor-payments` |
| `GET` | `/contractor-payments/:id` |
| `PATCH` | `/contractor-payments/:id` |
| `POST` | `/contractor-payments/:id/submit` |
| `POST` | `/contractor-payments/:id/approve` |
| `POST` | `/contractor-payments/:id/release` |
| `POST` | `/contractor-payments/:id/verify` |
| `POST` | `/contractor-payments/:id/post` |
| `POST` | `/contractor-payments/:id/cancel` |
