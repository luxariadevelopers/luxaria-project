# Vendor Payments API — Luxaria Developers ERP

Base path: `/api/v1/vendor-payments`  
Swagger tag: **Vendor Payments**

## Permissions

| Permission | Usage |
|------------|--------|
| `payment.view` | List, get |
| `payment.release` | Create, update, submit, bank release, cancel |
| `payment.approve` | Approve, verify, post |

## Numbering

| Field | Meaning |
|-------|---------|
| `paymentNumber` | System `VP-YYYY-######` |

## Workflow

```
Draft → Approval → Released → Verified → Posted
```

| Action | Transition |
|--------|------------|
| `POST …/submit` | Draft → Approval |
| `POST …/approve` | Approval → Released |
| `POST …/release` | Records bank release (`releasedBy`; status stays Released) |
| `POST …/verify` | Released → Verified |
| `POST …/post` | Verified → Posted |

## Fields

| Field | Notes |
|-------|--------|
| `vendorId` / `projectId` | Must match allocated invoices |
| `invoiceIds` | Derived from allocations |
| `allocations[]` | `{ invoiceId, amount }` — sum must equal `amount` |
| `paymentDate` | Payment date |
| `amount` | Gross AP reduction |
| `paymentMode` | `bank_transfer`, `neft`, `rtgs`, `imps`, `upi`, `cheque`, `other` |
| `bankAccountId` | Active company bank account |
| `transactionReference` | **Required** bank UTR / transaction ID |
| `tds` / `retention` / `deductions` | Withheld from bank outflow |
| `bankAmount` | `amount − tds − retention − deductions` |
| `paymentProof` | Optional document id/path |
| `status` | Workflow status |

## Accounting (on post)

| Side | Account |
|------|---------|
| Debit | Vendor Payable (party = vendor) for `amount` |
| Credit | TDS Payable (`tds`, if any) |
| Credit | Retention Payable (`retention`, if any) |
| Credit | Other Income (`deductions`, if any) |
| Credit | Bank ledger linked to `bankAccountId` for `bankAmount` |

Invoice `paidAmount` is increased by each allocation. When remaining payable reaches zero, invoice status becomes `paid`.

## Rules

1. Payment cannot exceed approved payable (posted + matched / exception-approved invoice remaining).
2. Partial payments are supported.
3. Payment must be allocated across one or more invoices; allocation total = `amount`.
4. `transactionReference` (transaction ID) is required and unique per bank account.
5. Open (non-posted) payments reserve payable so concurrent drafts cannot over-allocate.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/vendor-payments` |
| `GET` | `/vendor-payments` |
| `GET` | `/vendor-payments/:id` |
| `PATCH` | `/vendor-payments/:id` |
| `POST` | `/vendor-payments/:id/submit` |
| `POST` | `/vendor-payments/:id/approve` |
| `POST` | `/vendor-payments/:id/release` |
| `POST` | `/vendor-payments/:id/verify` |
| `POST` | `/vendor-payments/:id/post` |
| `POST` | `/vendor-payments/:id/cancel` |
