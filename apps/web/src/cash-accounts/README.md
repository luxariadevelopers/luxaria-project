# Cash & Petty Cash Accounts (Micro Phase 047)

Route: `/accounting/cash-accounts`

Nav: **Accounting → Cash & Petty Cash** (`cash.view`, project required).

## APIs

| Endpoint | Permission |
|----------|------------|
| `GET /cash-accounts` · `GET /cash-accounts/:id` · `GET …/balance` | `cash.view` |
| `POST /cash-accounts` | `cash.manage` |
| `POST …/transfer-custodian` · `POST …/cancel-handover` · `POST …/close` | `cash.manage` |
| `POST …/confirm-handover` | `cash.view` (outgoing/incoming custodians only) |
| `GET /users` (custodian picker) | `user.view` |
| `GET /accounts` Cash / Petty Cash (ledger picker) | `account.view` |

Prompt alias `cash_account.view/manage` is **not** in the Nest catalog — use `cash.view` / `cash.manage`.

## UI

| Piece | Role |
|-------|------|
| `CashBalanceCards` | Open balance total, open count, pending handover, replenishment |
| `CashAccountTable` | Code, name, kind, custodian, balance, max hold, status + actions |
| `CreateCashAccountDrawer` | Create with required custodian + ledger |
| `CustodianHandoverDialog` | Transfer / confirm / cancel handover |
| `CloseCashAccountDialog` | Close when balance is zero (client preview; Nest authoritative) |

## Rules

1. **One active custodian** while open — create requires `custodianUserId`
2. **Custodian change** — `transfer-custodian` then dual confirm (not direct assign)
3. **Close** — Nest rejects non-zero balance / open handover
4. Route guard + Nest **403** — hiding buttons is not enough
