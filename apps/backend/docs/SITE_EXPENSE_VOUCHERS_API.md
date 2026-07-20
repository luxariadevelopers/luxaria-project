# Site Expense Vouchers API — Luxaria Developers ERP

Base path: `/api/v1/site-expense-vouchers`  
Auth: Bearer access token  
Swagger tag: **Site Expense Vouchers**

## Workflow

`draft` → `submitted` → `verified` → `approved` → `posted`

Also: `returned` · `rejected` · `cancelled`

Posted vouchers are **immutable**.

## Accounting (on post)

| Side | Account |
|------|---------|
| Debit | Expense (`expenseCategory.defaultLedgerAccountId`) or WIP (when `boqItemId` is set) |
| Credit | Petty Cash (`pettyCashAccountId.ledgerAccountId`) |

Created via `JournalService.create(..., { post: true })`.

## Fields

| Field | Notes |
|-------|--------|
| `voucherNumber` | `EXP-YYYY-######` |
| `projectId` / `pettyCashAccountId` | Site petty cash |
| `expenseDate` / `expenseCategoryId` / `amount` | Core expense |
| `paidTo` / `mobileNumber` / `purpose` | Payee details |
| `boqItemId` | Optional; selects WIP debit when set |
| `paymentMode` | cash / upi / bank_transfer / cheque / other |
| `billNumber` / `billDate` | Bill metadata |
| `attachments[]` | `bill` / `photo` / `signature` / `other` |
| `latitude` / `longitude` / `deviceId` | Capture metadata |
| `submittedBy` | Set on submit |
| `status` / `warnings` | Workflow + soft warnings |

## Rules

1. **Bill** — required on submit+ when category `requiresBill`
2. **Photo** — required on submit+ when category `requiresPhoto`
3. **Signature** — required on submit+ when category `requiresSignature`
4. **Backdated** — warning when `expenseDate` &lt; today
5. **GPS** — warning when distance from project coords &gt; `project.siteRadiusMeters` (default 500m)
6. **Duplicate bills** — warning when same project + bill number + amount already exists
7. **Posted immutable** — no update/cancel after post
8. **Segregation** — submitter ≠ verifier; verifier ≠ approver; approver ≠ poster

## Permissions

| Permission | Use |
|------------|-----|
| `expense.view` | List / get |
| `expense.create` | Create, update, submit, cancel |
| `expense.approve` | Verify, approve, reject, return |
| `expense.post` | Post + journal |

## Endpoints

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/site-expense-vouchers` | Create draft |
| `GET` | `/site-expense-vouchers` | List |
| `GET` | `/site-expense-vouchers/:id` | Get |
| `PATCH` | `/site-expense-vouchers/:id` | Update draft/returned |
| `POST` | `/site-expense-vouchers/:id/submit` | Submit |
| `POST` | `/site-expense-vouchers/:id/verify` | Verify |
| `POST` | `/site-expense-vouchers/:id/approve` | Approve |
| `POST` | `/site-expense-vouchers/:id/post` | Post |
| `POST` | `/site-expense-vouchers/:id/reject` | Reject |
| `POST` | `/site-expense-vouchers/:id/return` | Return |
| `POST` | `/site-expense-vouchers/:id/cancel` | Cancel |
