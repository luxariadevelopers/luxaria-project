# Company bank accounts (Micro Phase 046)

Routes:
- `/accounting/bank-accounts` — masked list + create
- `/accounting/bank-accounts/:bankAccountId` — detail cards, balance, ledger, manage actions

Nav: **Accounting → Bank Accounts** (`projectScope: none`).

## APIs

Base: `/company-bank-accounts`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` · `GET /:id/balance` · `GET /:id/ledger` | `bank.view` |
| `POST /` · `PATCH /:id` · `POST /:id/activate` · `POST /:id/deactivate` · `POST /:id/set-default` | `bank.manage` |
| Full account number on `GET /:id` | `bank.view_sensitive` **or** `bank.manage` |

Ledger picker: `GET /accounts?accountCategory=bank` — `account.view`.

Nest has **no** `bank_account.view/create/update` codes — use `bank.*` only.

## Security / masking

1. List rows always use `maskedAccountNumber`; client also nulls `accountNumber` via `toListSafeBankAccount`
2. Detail keeps numbers masked by default; Reveal only when Nest returned `accountNumber`
3. Route guards (`RegistryRouteGuard`) + Nest 403 → `PermissionDenied` — hiding buttons is not enough
4. Status-gated actions: only **active** can deactivate / set-default; only **inactive** can activate

## UI

| Piece | Role |
|-------|------|
| `MaskedAccountTable` | List with masked account column |
| `BankAccountFilters` | status, project, companyOnly, search |
| `CreateBankAccountDrawer` / `EditBankAccountDrawer` | IFSC + account number Zod validation |
| `BankAccountDetailCards` | Master fields + balance summary |
| `BankLedgerTable` | Posted journal lines for linked COA bank ledger |
