# Double-Entry Journal API — Luxaria Developers ERP

Base path: `/api/v1/journals`  
Auth: Bearer access token  
Swagger tag: **Journal**

Production-grade double-entry journals with MongoDB transactions, FY lock enforcement, COA dimension rules, and idempotent create.

## Statuses

| Status | Value | Meaning |
|--------|-------|---------|
| Draft | `draft` | Editable |
| Pending Approval | `pending_approval` | Awaiting approval |
| Posted | `posted` | Immutable |
| Reversed | `reversed` | Corrected via reversing entry |
| Cancelled | `cancelled` | Abandoned draft/pending |

## Permissions

| Permission | Use |
|------------|-----|
| `journal.view` | List / get |
| `journal.create` | Create, update, submit, cancel |
| `journal.post` | Post |
| `journal.reverse` | Reverse posted journals |

## Header fields

`journalNumber` (`JV-YYYY-######`) · `journalDate` · `financialYearId` · `projectId` · `sourceModule` · `sourceEntityType` · `sourceEntityId` · `narration` · `status` · `totalDebit` · `totalCredit` · `postedAt` · `postedBy` · `reversalOf` · `idempotencyKey`

## Line fields

`accountId` · `debit` · `credit` · `projectId` · `blockId` · `costCentreId` · `boqItemId` · `partyType` · `partyId` · `fundingSource` · `description`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/journals` | Create draft (`Idempotency-Key` optional; `post: true` to post immediately) |
| `GET` | `/journals` | List (status, project, FY, date range) |
| `GET` | `/journals/:id` | Get |
| `PATCH` | `/journals/:id` | Update draft / pending |
| `POST` | `/journals/:id/submit` | Draft → pending approval |
| `POST` | `/journals/:id/post` | Post (transactional) |
| `POST` | `/journals/:id/reverse` | Reverse posted (transactional) |
| `POST` | `/journals/:id/cancel` | Cancel draft / pending |

## Rules

1. **Balance** — `totalDebit === totalCredit`
2. **Single side** — a line cannot have both debit and credit
3. **Immutability** — posted journals cannot be edited
4. **Corrections** — only via reversal (swapped lines, new posted JV)
5. **Transactions** — post / reverse use `DatabaseService.withTransaction`
6. **Locked FY** — `FinancialYearService.assertPostingAllowed` on post/reverse
7. **Dimensions** — COA `requiresProject` / `requiresParty` enforced on lines
8. **Idempotency** — `Idempotency-Key` + unique `idempotencyKey` on journal
9. **Control accounts** — blocked unless `allowManualPosting`

## Numbering

`NumberEntityType.JOURNAL_ENTRY` → `JV-2026-000001` (FY from journal date; project-scoped when `projectId` set).
