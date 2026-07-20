# Contractor payments (Micro Phase 096)

Route: `/contractors/payments` — list + bill allocation form + workflow.

Nav: **Contractors → Payments** (`payment.view`, `projectScope: required`).

Running bills (parallel phase): `/contractors/running-bills` — deep-linked from
this page; do not invent that module here.

## APIs

Base: `/contractor-payments` (Swagger tag **Contractor Payments**)

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `payment.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `POST …/release` · `POST …/cancel` | `payment.release` |
| `POST …/approve` · `POST …/verify` · `POST …/post` | `payment.approve` |
| `GET /contractor-bills?status=posted` (allocation picker) | `running_bill.view` |
| `GET /company-bank-accounts` | `bank.view` |
| `GET /contractors` | `contractor.view` |

Prompt aliases `contractor_payment.view/create/approve/release/post` are **not** Nest codes.

## Workflow

```
Draft → Approval → Released → Verified → Posted
```

| Action | Transition |
|--------|------------|
| submit | Draft → Approval |
| approve | Approval → Released |
| release | Records bank release (`releasedBy`; requires `paymentProof` + `transactionReference`; status stays Released) |
| verify | Released → Verified (requires prior bank release) |
| post | Verified → Posted (Dr Contractor Payable / Cr Bank + withholdings) |

## Rules

1. Only **posted** running bills can be paid (Nest gate; director-approved alone is not enough)
2. Allocation total must equal payment `amount`; each allocation ≤ remaining payable (`netPayable − paidAmount`)
3. Partial payments supported
4. Payment-level `tds` / `retention` / `advanceRecovery` / `penalty` reduce `bankAmount`
5. `transactionReference` required (unique per bank account)
6. Active project required

## Components

- `PaymentForm` — create/edit/view drawer
- `BillAllocationEditor` — multi-bill allocation + bill withholdings display
- `PaymentProofPanel` — document id/path proof
- `PaymentTable` / `PaymentFilters` / `PaymentStatusChip`
