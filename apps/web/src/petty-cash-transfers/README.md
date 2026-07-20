# Petty-cash fund transfers (Micro Phase 050)

Route: `/accounting/petty-cash/transfers`  
Nav: **Petty Cash → Fund Transfers** (`projectScope: required`)

## APIs

Base: `/petty-cash-fund-transfers`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` · `GET /request/:requestId/balance` | `petty_cash.view` |
| `POST /` · `PATCH /:id` · `POST /:id/verify` · `POST /:id/post` · `POST /:id/cancel` | `petty_cash.fund` |

Supporting selectors:

| Endpoint | Permission |
|----------|------------|
| `GET /petty-cash-requirements?status=approved\|funded` | `petty_cash.view` |
| `GET /company-bank-accounts` | `bank.view` |
| Documents presign / confirm (proof) | `document.upload` |

Prompt aliases such as `petty_cash_transfer.create/verify/post` are **not** in the Nest catalog — create / verify / post / cancel all use `petty_cash.fund`.

## Workflow

`draft` → `verified` → `posted` (+ `cancelled` from draft/verified)

On **post**, Nest creates Dr Site Petty Cash / Cr Bank via `JournalService` and increases requirement `fundedAmount`.

## UI rules

1. Amount cannot exceed `remainingApprovedBalance` (client preview; Nest authoritative)
2. Transaction reference required (before verify; enforced in create form)
3. Payment proof required before verify (`paymentProof` path/document id)
4. Destination petty-cash account locked to the requirement account
5. Soft duplicate txn-ref check against loaded transfers (same bank + ref)
6. Route guard + Nest 403 — hiding buttons is not enough
