# Cash & Petty-Cash Accounts API — Luxaria Developers ERP

Base path: `/api/v1/cash-accounts`  
Auth: Bearer access token  
Swagger tag: **Cash Accounts**

Site cash and petty-cash float management with custodian accountability and journal-linked balances.

## Fields

| Field | Notes |
|-------|--------|
| `accountCode` | `CSH-####` (project-scoped counter) |
| `accountName` | Display name |
| `kind` | `site_cash` · `petty_cash` |
| `projectId` | Required — site-scoped |
| `custodianUserId` | Active custodian (required while open) |
| `ledgerAccountId` | COA Cash / Petty Cash account |
| `maximumHoldingLimit` | Float ceiling |
| `replenishmentLevel` | Replenishment trigger |
| `status` | `active` · `pending_handover` · `closed` |

## Permissions

| Permission | Use |
|------------|-----|
| `cash.view` | List, get, balance, ledger, confirm handover |
| `cash.manage` | Create, transfer, cancel handover, close |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cash-accounts` | Create site cash / petty-cash |
| `GET` | `/cash-accounts` | List |
| `GET` | `/cash-accounts/:id` | Get |
| `GET` | `/cash-accounts/:id/balance` | Current balance |
| `GET` | `/cash-accounts/:id/ledger` | Posted journal lines |
| `POST` | `/cash-accounts/:id/assign-custodian` | Initial assign only |
| `POST` | `/cash-accounts/:id/transfer-custodian` | Start handover |
| `POST` | `/cash-accounts/:id/confirm-handover` | Outgoing + incoming confirm |
| `POST` | `/cash-accounts/:id/cancel-handover` | Cancel pending handover |
| `POST` | `/cash-accounts/:id/close` | Close (zero balance) |

## Rules

1. **Active custodian** — petty/site cash must have a custodian while open
2. **Handover** — custodian changes require both outgoing and incoming confirmation
3. **Non-negative** — `assertSufficientBalance` blocks disbursements that would go negative; balance view exposes `isNegative`
4. **Close** — only when system balance is zero; no open handover

## Balance

`currentBalance = openingBalance + Σ debit − Σ credit` on posted journals for `ledgerAccountId`.

Also returns `needsReplenishment` and `isOverLimit` against configured levels.
