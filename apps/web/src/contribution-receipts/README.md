# Contribution receipts (Micro Phase 039)

Route: `/capital/contribution-receipts`  
Nav: **Capital & Investment → Contribution Receipts** (`projectScope: required`)

## APIs

Base: `/projects/:projectId/contribution-receipts`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /balances` | `contribution_receipt.view` |
| `POST /` | `contribution_receipt.create` |
| `POST /:id/submit` | `contribution_receipt.submit` |
| `POST /:id/verify` | `contribution_receipt.verify` |
| `POST /:id/post` | `contribution_receipt.post` |
| `POST /:id/cancel` | `contribution_receipt.cancel` |
| `POST /:id/document` | `contribution_receipt.upload_document` |

Receiving bank selector uses `GET /company-bank-accounts` (`bank.view`) when available.

## Workflow

`draft` → `submitted` → `verified` → `posted` (+ `cancelled` pre-post)

PDF is generated on **post** (`receiptPdfPath`). Open via `resolveUploadsUrl` (no Nest download route).

## UI rules

1. Allocation = single `commitmentId` (approved, open headroom)
2. Bank transfer / cheque require bank account + transaction reference
3. Duplicate txn ref → Nest **409** (`Duplicate transaction reference for this bank account`)
4. Amount cannot exceed remaining commitment (client preview; Nest authoritative)
5. Route guard + Nest 403 — hiding buttons is not enough
