# R-002 completion — Contractor running-bill AP posting (DEF-ACC-002)

**Status:** PASS
**Date:** 2026-07-20
**R-003+:** Not implemented

> Superseded accounting note: R-002A replaces the bundled `OtherIncome`
> treatment below with dedicated contractor-advance and recovery accounts.
> See `R-002A-completion.md` for the current posting policy.

## Root cause

`ContractorBillsService.post()` previously transitioned a director-approved bill to `Posted` and set `postedAt` / `postedBy` without calling `JournalService`. The bill schema had no durable `journalEntryId`, so contractor cost and payable were never recognised in the general ledger.

## Accounting design

On post from `director_approved`:

| Side | Account category | Amount |
| --- | --- | --- |
| Debit | `WorkInProgress` | `currentCertifiedValue` (certified gross) |
| Credit | `RetentionPayable` (+ contractor party) | `retention` when > 0 |
| Credit | `TdsPayable` | `tds` when > 0 |
| Credit | `OtherIncome` | `advanceRecovery + materialRecovery + penalty + otherDeductions` when > 0 |
| Credit | `ContractorPayable` (+ contractor party) | `netPayable` when > 0 |

Journal metadata uses existing conventions:

- `sourceModule` / `sourceEntityType` = `contractor_bill`
- `sourceEntityId` = bill id
- project, narration with bill / RA number, journal date from director approval (fallback billing period end)
- FY/period gate via `FinancialYearService.assertPostingAllowed`

## Bill formula (authoritative)

```
netPayable =
  currentCertifiedValue
  − (advanceRecovery + materialRecovery + retention + tds + penalty + otherDeductions)
```

Posting revalidates:

- `netPayable` matches `computeBillAmounts(...)`
- `cumulativeValue = previousCertifiedValue + currentCertifiedValue`
- measurement `cumulativeQuantity = previousQuantity + currentQuantity`
- certified value > 0; measurements present

## Account mappings

Resolved by active COA `accountCategory` (no hardcoded Mongo IDs). Missing/inactive mapping rejects posting with a domain error and leaves the bill in `director_approved`.

There is no dedicated mobilisation-advance control account in the COA; advance/material/penalty/other recoveries credit `OtherIncome`, matching contractor-payment conventions for those components.

## Transaction / immutability design

1. Idempotency begin (`scope=contractor.bill`, key `ctr-bill-post:{billId}`).
2. Validate status, amounts, project/contractor/agreement, open period.
3. Create-or-reuse journal by source (`contractor-bill-journal:{billId}` + source entity lookup); post via `JournalService`.
4. Finalize bill inside `DatabaseService.withTransaction`: set `journalEntryId`, `status=Posted`, `postedAt`, `postedBy`.
5. Immutable audit (`module=contractor_bill`) including journal id and amounts.
6. Idempotency complete / fail.

Posted bills remain non-editable (`EDITABLE_BILL_STATUSES` = draft/rejected only). No bill becomes Posted without a non-null `journalEntryId`.

## Idempotency / concurrency

- Application idempotency key + journal source uniqueness / reuse.
- Concurrent posts converge on one journal; replay returns the posted bill with the same `journalEntryId`.

## Contractor payment compatibility

Contractor payment posting debits the same `ContractorPayable` control account credited by the bill. Golden E2E asserts matching `accountId` and clearing of net payable.

## Retention / TDS / advance

- **Retention:** credited to `RetentionPayable` at bill post (held out of contractor payable). Retention-release workflow is not implemented (follow-on).
- **TDS:** credited to `TdsPayable`.
- **Advance recovery:** credited via `OtherIncome` with other recoveries (no mobilisation-advance COA).

## Files changed (R-002)

Primary:

- `apps/backend/src/modules/contractor-bills/contractor-bills.service.ts`
- `apps/backend/src/modules/contractor-bills/contractor-bills.module.ts`
- `apps/backend/src/modules/contractor-bills/contractor-bills.mapper.ts`
- `apps/backend/src/modules/contractor-bills/schemas/contractor-bill.schema.ts`
- `apps/backend/src/modules/contractor-bills/contractor-bills.controller.ts`
- `apps/backend/src/database/services/idempotency.service.ts`
- `apps/backend/docs/CONTRACTOR_BILLS_API.md`
- `apps/backend/src/modules/contractor-bills/contractor-bills.service.spec.ts`
- `apps/backend/src/modules/contractor-bills/contractor-bills.integration.spec.ts`
- `apps/backend/test/golden-path-contractor-billing.e2e-spec.ts`
- `apps/backend/test/helpers/golden-path/cleanup.ts`

Supporting (E2E boot / toolchain):

- `apps/backend/src/modules/notifications/notifications.module.ts` — register `UsersModule` + `EmailSmtpProvider` so AppModule boots for golden path
- `apps/backend/src/modules/notifications/channels/email-smtp.provider.ts` — null-safe SMTP typing
- lint-only: `health.service.spec.ts`, `email.channel.spec.ts`

Docs:

- `docs/audit/remediation/R-002-completion.md`
- `docs/audit/remediation/R-002-legacy-reconciliation-plan.md`
- `docs/audit/54-master-defect-register.csv` (DEF-ACC-002 only)

## Tests

| Suite | Result |
| --- | --- |
| Contractor bill / payment / journal unit (6 suites, 34 tests) | PASS |
| Contractor bill integration (`jest.integration.config.js`) | PASS (5 tests) |
| Golden path contractor billing E2E | PASS (1 test) |

## Commands / results

```text
pnpm --filter @luxaria/backend typecheck          → PASS
pnpm --filter @luxaria/backend lint               → PASS (warnings only in pre-existing audit/approval schemas)
pnpm --filter @luxaria/backend exec jest --runInBand \
  --testPathPattern='contractor-bills.service.spec|contractor-bills.validation|contractor-payments.service.spec|contractor-payments.validation|journal.service.spec|journal.validation'
  → PASS (6 suites / 34 tests)
pnpm --filter @luxaria/backend exec jest --config jest.integration.config.js --runInBand \
  --testPathPattern='contractor-bills'
  → PASS (5 tests)  [requires unrestricted local process for MongoMemoryReplSet]
pnpm --filter @luxaria/backend exec jest --config jest.e2e.config.js --runInBand --forceExit \
  --testPathPattern='golden-path-contractor-billing'
  → PASS
pnpm --filter @luxaria/backend build              → PASS
```

## Legacy impact

No automatic backfill. See `R-002-legacy-reconciliation-plan.md`.

## Known limitations

1. No mobilisation-advance asset account; recoveries credit `OtherIncome`.
2. Retention release accounting not implemented.
3. Bill reversal/replacement workflow not added in R-002.
4. Payment path can still withhold TDS/retention at payment time (pre-existing).
5. Historical Posted bills without journals require controlled finance-approved reconciliation.

## DEF-ACC-002

**Resolved** — acceptance criteria 1–25 met for new postings; legacy handled by documented plan.
