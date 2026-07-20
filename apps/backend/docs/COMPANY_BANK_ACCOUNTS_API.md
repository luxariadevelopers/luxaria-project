# Company Bank Accounts API — Luxaria Developers ERP

Base path: `/api/v1/company-bank-accounts`  
Auth: Bearer access token  
Swagger tag: **Company Bank Accounts**

## Fields

| Field | Notes |
|-------|--------|
| `accountCode` | `BA-0001` (auto) |
| `bankName` / `branch` / `accountHolderName` | Master details |
| `maskedAccountNumber` | e.g. `XXXXXX9012` — always returned |
| `encryptedAccountNumber` | AES-256-GCM at rest (`select: false`) |
| `ifsc` | Validated IFSC |
| `accountType` | `current` · `savings` · `overdraft` · `cash_credit` · `escrow` · `other` |
| `projectId` | Null = company-level; set for project-specific |
| `ledgerAccountId` | Must be COA **Bank** category |
| `openingBalance` | Starting balance |
| `status` | `active` / `inactive` |
| `isDefault` | One default per project (or company-wide) |

## Permissions

| Permission | Use |
|------------|-----|
| `bank.view` | List, get (masked), balance, ledger |
| `bank.manage` | Create, update, activate/deactivate, set default; also decrypts |
| `bank.view_sensitive` | Decrypt full account number on get |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/company-bank-accounts` | Create |
| `GET` | `/company-bank-accounts` | List (masked only) |
| `GET` | `/company-bank-accounts/:id` | Get (sensitive if permitted) |
| `PATCH` | `/company-bank-accounts/:id` | Update |
| `POST` | `/company-bank-accounts/:id/activate` | Activate |
| `POST` | `/company-bank-accounts/:id/deactivate` | Deactivate |
| `POST` | `/company-bank-accounts/:id/set-default` | Assign default project/company bank |
| `GET` | `/company-bank-accounts/:id/balance` | Opening + posted journal net |
| `GET` | `/company-bank-accounts/:id/ledger` | Posted journal lines for ledger account |

## Rules

1. Account numbers encrypted with `FIELD_ENCRYPTION_KEY`; never stored plain
2. List APIs never return full account numbers
3. `ledgerAccountId` must be an active Bank-category COA account
4. Balance = `openingBalance + Σ debit − Σ credit` on posted journals
5. Only one `isDefault` bank account per `projectId` (null = company default)
