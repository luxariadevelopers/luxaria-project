# Contribution Receipts API — Luxaria Developers ERP

Base path: `/api/v1/projects/:projectId/contribution-receipts`  
Auth: Bearer access token required  
Swagger tag: **Contribution Receipts**

## Workflow

`draft` → `submitted` → `verified` → `posted`

## Payment modes

`bank_transfer` | `cheque` | `cash` | `loan_adjustment` | `journal_adjustment`

Bank transfer / cheque require `bankAccountId` + `transactionReference`.

## Requirements

1. **Idempotency** — send header `Idempotency-Key` on create (scope `contribution.receipt`).
2. **Duplicate txn refs blocked** — same `transactionReference` cannot repeat for the same `bankAccountId` (non-cancelled).
3. **Accounting later** — `journalEntryId` reserved; post sets balances/PDF first.
4. **Balances** — project + participant contribution balances updated on post; commitment `receivedAmount` synced.
5. **PDF** — generated on post (`receiptPdfPath`).

## Permissions

| Permission | Use |
|------------|-----|
| `contribution_receipt.view` | List / view / balances |
| `contribution_receipt.create` | Create draft |
| `contribution_receipt.submit` | Submit |
| `contribution_receipt.verify` | Verify |
| `contribution_receipt.post` | Post |
| `contribution_receipt.cancel` | Cancel (pre-post) |
| `contribution_receipt.upload_document` | Upload supporting file |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create (`Idempotency-Key` optional) |
| GET | `/` | List |
| GET | `/balances` | Project / participant balances |
| GET | `/:id` | View |
| POST | `/:id/submit` | Submit |
| POST | `/:id/verify` | Verify |
| POST | `/:id/post` | Post + PDF + balances |
| POST | `/:id/cancel` | Cancel |
| POST | `/:id/document` | Upload document |

## Fields

`receiptNumber` (`CTR-YYYY-######`), `projectId`, `participantId`, `commitmentId`, `receivedDate`, `amount`, `paymentMode`, `bankAccountId`, `transactionReference`, `receiptDocument`, `remarks`, `status`.
