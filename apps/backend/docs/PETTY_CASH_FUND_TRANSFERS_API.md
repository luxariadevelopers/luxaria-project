# Petty-Cash Fund Transfers API — Luxaria Developers ERP

Base path: `/api/v1/petty-cash-fund-transfers`  
Auth: Bearer access token  
Swagger tag: **Petty Cash Fund Transfers**

## Workflow

`draft` → `verified` → `posted`

Also: `cancelled` (from draft or verified only)

## Accounting (on post)

| Side | Account |
|------|---------|
| Debit | Site Petty Cash (`destinationPettyCashAccountId.ledgerAccountId`) |
| Credit | Bank (`sourceBankAccountId.ledgerAccountId`) |

Created via `JournalService.create(..., { post: true })` with idempotency key `pcft-journal:<transferId>`.

Petty-cash **balances update only after posting**, through posted journal lines (no side balance write on the cash account).

## Fields

| Field | Notes |
|-------|--------|
| `transferNumber` | `PCF-YYYY-######` |
| `projectId` | Must match requirement project |
| `requestId` | Approved/funded weekly requirement |
| `sourceBankAccountId` | Company/project bank account |
| `destinationPettyCashAccountId` | Must match requirement petty-cash account |
| `transferDate` | Transfer date |
| `amount` | ≤ remaining approved request balance |
| `transactionReference` | Required before verify |
| `paymentProof` | Required before verify |
| `status` | draft / verified / posted / cancelled |
| `journalEntryId` | Set on post |

## Permissions

| Permission | Use |
|------------|-----|
| `petty_cash.view` | List / get / remaining balance |
| `petty_cash.fund` | Create, update, verify, post, cancel |

## Rules

1. **Journal service** — posting always goes through `JournalService`
2. **Idempotency** — create accepts `Idempotency-Key`; post uses provided key or `pcft-post:<transferId>`
3. **Approved balance** — `amount ≤ approvedAmount − max(fundedAmount, committedTransfers)` where committed = draft + verified + posted for the request
4. **Balance timing** — cash float increases only when the journal is posted
5. **Requirement funding** — on post, requirement `fundedAmount` increases and status moves `approved` → `funded`

## Endpoints

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/petty-cash-fund-transfers` | Create draft |
| `GET` | `/petty-cash-fund-transfers` | List |
| `GET` | `/petty-cash-fund-transfers/request/:requestId/balance` | Remaining approved balance |
| `GET` | `/petty-cash-fund-transfers/:id` | Get |
| `PATCH` | `/petty-cash-fund-transfers/:id` | Update draft |
| `POST` | `/petty-cash-fund-transfers/:id/verify` | Verify |
| `POST` | `/petty-cash-fund-transfers/:id/post` | Post + journal |
| `POST` | `/petty-cash-fund-transfers/:id/cancel` | Cancel draft/verified |
