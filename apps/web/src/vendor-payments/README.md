# Vendor payments (Micro Phase 076)

Route: `/procurement/vendor-payments` — list + allocation form + workflow.

Nav: **Procurement → Vendor Payments** (`payment.view`, `projectScope: required`).

Three-way match UI lives under vendor invoices:
`/procurement/vendor-invoices/:invoiceId/match`.

## APIs

Base: `/vendor-payments` (Swagger tag **Vendor Payments**)

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `payment.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `POST …/release` · `POST …/cancel` | `payment.release` |
| `POST …/approve` · `POST …/verify` · `POST …/post` | `payment.approve` |
| `GET /vendor-invoices?status=posted` (allocation picker) | `vendor_invoice.view` |
| `GET /company-bank-accounts` | `bank.view` |

Prompt aliases `vendor_payment.create/approve/release/post` are **not** Nest codes.

## Workflow

```
Draft → Approval → Released → Verified → Posted
```

| Action | Transition |
|--------|------------|
| submit | Draft → Approval |
| approve | Approval → Released |
| release | Records bank release (`releasedBy`; status stays Released) |
| verify | Released → Verified |
| post | Verified → Posted (Dr Vendor Payable / Cr Bank + withholdings) |

## Rules

1. No payment until invoice is **posted** and matching is `matched` / `matched_with_tolerance`, or `exception` + `exceptionApproved`
2. Allocation total must equal payment `amount`; each allocation ≤ remaining payable
3. Partial payments supported
4. `transactionReference` required (unique per bank account)
5. Active project required
