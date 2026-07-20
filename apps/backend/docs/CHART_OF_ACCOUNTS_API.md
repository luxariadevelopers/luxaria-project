# Chart of Accounts API — Luxaria Developers ERP

Base path: `/api/v1/accounts`  
Auth: Bearer access token  
Swagger tag: **Chart of Accounts**

## Account types

`asset` · `liability` · `equity` · `income` · `expense`

## Account categories

`bank` · `cash` · `petty_cash` · `director_account` · `investor_account` · `customer_advance` · `vendor_payable` · `contractor_payable` · `labour_payable` · `material_purchase` · `work_in_progress` · `land_cost` · `direct_expense` · `indirect_expense` · `input_gst` · `output_gst` · `tds_payable` · `retention_payable` · `loan` · `interest` · `sales` · `other_income` · `control`

## Fields

| Field | Notes |
|-------|--------|
| `accountCode` | Unique, uppercase |
| `accountName` | Display name |
| `accountType` | Type enum |
| `accountCategory` | Category enum |
| `parentAccountId` | Hierarchy parent |
| `level` | Root = 1 |
| `isControlAccount` | Header / summary node |
| `allowManualPosting` | Manual journal lines |
| `requiresProject` | Project dimension required |
| `requiresParty` | Party dimension required |
| `status` | `active` / `inactive` |
| `postingCount` | Set by journal module; blocks delete |

## Permissions

| Permission | Use |
|------------|-----|
| `account.view` | List, get, tree |
| `account.manage` | Create, update, hierarchy, activate/deactivate, delete, seed |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/accounts` | Create |
| `GET` | `/accounts` | List (filters: type, category, status, search, parent) |
| `GET` | `/accounts/tree` | Hierarchy tree |
| `GET` | `/accounts/by-code/:accountCode` | Lookup by code |
| `GET` | `/accounts/:id` | Get by id |
| `PATCH` | `/accounts/:id` | Update |
| `POST` | `/accounts/:id/parent` | Move in hierarchy |
| `POST` | `/accounts/:id/activate` | Activate |
| `POST` | `/accounts/:id/deactivate` | Deactivate |
| `DELETE` | `/accounts/:id` | Soft-delete (no postings) |
| `POST` | `/accounts/seed-standard` | Seed construction COA |

## Rules

1. **No delete with postings** — `postingCount > 0` → conflict
2. **Control accounts** — cannot accept manual postings unless `allowManualPosting` is true (`assertAllowsManualPosting`)
3. Child type must match parent type; cycles rejected
4. System-seeded accounts (`isSystem`) cannot be deleted

## Seed

On app boot (and via `POST /accounts/seed-standard`), the standard construction COA is applied idempotently by `accountCode` (1000–5400 range: Assets, Liabilities, Equity, Income, Expenses).

## Journal integration helpers

```ts
await chartOfAccountsService.assertAllowsManualPosting(accountId);
await chartOfAccountsService.incrementPostingCount(accountId);
```
