# Site expenses (Micro Phase 052)

Route: `/accounting/expenses`  
Nav: **Petty Cash → Site Expenses** (`projectScope: required`)

## APIs

Base: `/site-expense-vouchers`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `expense.view` |
| `POST /:id/verify` · `POST /:id/approve` · `POST /:id/reject` · `POST /:id/return` | `expense.approve` |
| `POST /:id/post` | `expense.post` |
| `POST /` · `PATCH /:id` · `POST /:id/submit` · `POST /:id/cancel` | `expense.create` |

There is **no** `expense.verify` in the Nest catalog — verify uses `expense.approve`.

## Workflow

`draft` → `submitted` → `verified` → `approved` → `posted`  
Also: `returned` · `rejected` · `cancelled`

Posted vouchers are **immutable** (Nest rejects update/cancel).

## Soft warnings (review cues)

| Warning | Nest string cue | UI |
|---------|-----------------|----|
| Duplicate bill | `Possible duplicate bill` | `DuplicateWarningBadge` |
| GPS out of radius | `outside project radius` | `GpsWarningBadge` |
| Backdated | `Expense date is backdated` | tooltip via warnings array |

Evidence count = `attachments.length` (`EvidenceCount`).

## Filters

| Filter | Where |
|--------|--------|
| Project | Header project context → Nest `projectId` |
| Status | Nest `status` query |
| Date from / to | Client-only on `expenseDate` (list DTO has no date range) |

## UI

| Piece | File |
|-------|------|
| List page | `apps/web/src/pages/ExpensesPage.tsx` |
| Create drawer | `CreateExpenseDrawer.tsx` (`expense.create`) |
| Table | `ExpenseTable.tsx` |
| Filters | `ExpenseFilters.tsx` |
| Badges | `DuplicateWarningBadge`, `GpsWarningBadge`, `EvidenceCount` |

Create is project-scoped (header project) and credits the selected petty cash account on post.

---

# Site expense vouchers — detail (Micro Phase 053)

Routes:

| Path | Purpose |
|------|---------|
| `/accounting/expenses` | Minimal list stub (deep-link host; full list = Phase 052) |
| `/accounting/expenses/:expenseId` | Review / verify / approve / reject / post |

Nav: **Petty Cash → Site Expenses** (`projectScope: required`)

## APIs

Base: `/site-expense-vouchers`  
Docs: `apps/backend/docs/SITE_EXPENSE_VOUCHERS_API.md`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `expense.view` |
| `POST /:id/verify` · `POST /:id/approve` · `POST /:id/reject` · `POST /:id/return` | `expense.approve` |
| `POST /:id/post` | `expense.post` |
| `POST /:id/cancel` | `expense.create` |

Prompt aliases **`expense.verify`** and **`expense.reverse`** are **not** in the Nest catalog.

- Verify / reject / return → `expense.approve`
- There is **no** site-expense reverse endpoint. Posted vouchers are immutable; corrections use journal reverse on the linked `journalEntryId` (`journal.reverse`).

## Workflow

`draft` → `submitted` → `verified` → `approved` → `posted`

Also: `returned` · `rejected` · `cancelled`

On **post**, Nest creates Dr Expense/WIP / Cr Petty Cash via `JournalService` (`post: true`).

## UI rules

1. Reject requires comments → Nest field `reason`
2. Cancel requires `cancellationReason` (prompt “reversal reason”)
3. Evidence (bill / photo / signature) is display-only on this screen — do not mutate approved attachments
4. Map shows capture lat/lng when present
5. Journal link when `journalEntryId` is set
6. Route guard + Nest 403 — hiding buttons is not enough
7. Segregation of duties (submitter ≠ verifier ≠ approver ≠ poster) is Nest-enforced
