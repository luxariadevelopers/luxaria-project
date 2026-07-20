# R-002A completion — Contractor-bill deduction accounting & posting atomicity

**Status:** PASS (implementation verification; production index rollout remains)
**Date:** 2026-07-20
**R-003/R-003B integration:** `8aba945`

## Commands / results

| Command | Result |
| --- | --- |
| `pnpm --filter @luxaria/backend typecheck` | PASS |
| `pnpm --filter @luxaria/backend lint` | PASS with 5 warnings in unchanged approval/audit files |
| Contractor/journal/agreement/payment unit tests | PASS (4 suites / 31 tests) |
| Contractor bill integration | PASS (1 suite / 6 tests) |
| Golden path contractor billing E2E | PASS (1 suite / 1 test) |
| `pnpm --filter @luxaria/backend build` | PASS |

Mongo-backed tests required unrestricted local execution. In the command sandbox,
MongoMemoryServer exits before assertions with code 48; this remains tracked under
the test-infrastructure remediation rather than being treated as an accounting
test failure.

## Root cause corrected

R-002 recognised AP journals but:

1. Bundled advance / material / penalty / other recoveries into **Other Income**.
2. Had no Contractor Advance asset lifecycle.
3. Created/posted journals **outside** the bill finalisation Mongo transaction.
4. Lacked DB-level uniqueness for source bill journals.
5. Allowed contractor payments to re-withhold bill deductions.

## Accounting policy per deduction

| Bill field | Account category | Type | Treatment |
| --- | --- | --- | --- |
| `currentCertifiedValue` | `work_in_progress` | Asset | Debit project cost |
| `retention` | `retention_payable` | Liability | Credit liability |
| `tds` | `tds_payable` | Liability | Credit statutory liability |
| `advanceRecovery` | `contractor_advance` | Asset | Credit (reduce) advance asset — **never income** |
| `materialRecovery` | `material_recovery` | Income | Explicit material recharge/recovery account |
| `penalty` | `penalty_recovery` | Income | Explicit penalty recovery |
| `otherDeductions` | `other_contractor_deduction` | Income | Explicit legacy/other mapping (reject if missing) |
| `netPayable` | `contractor_payable` | Liability | Credit net payable |

Material recovery policy (documented): company/material recharge on RA bills credits `MaterialRecovery` (not inventory COGS adjustment). Inventory-linked treatment can be refined later without changing the category boundary.

## COA changes

New `AccountCategory` values + seed codes:

- `1160` Contractor Advance (asset, requires project + party)
- `4210` Material Recovery
- `4220` Penalty Recovery
- `4230` Other Contractor Deduction

Existing companies must re-run COA seed/upsert or create equivalent active posting accounts by category.

## Advance lifecycle

`POST /contractor-agreements/:id/disburse-advance` posts:

- Dr Contractor Advance
- Cr Bank

and stores `advanceDisbursementJournalId` on the agreement.

Bill recovery credits the **same** Contractor Advance account and is rejected when:

- agreement has no advance amount;
- advance was never disbursed;
- recovery exceeds remaining agreement advance or GL outstanding asset balance.

## Transaction / session

`JournalService.create` / `post` accept an optional `ClientSession`.

Bill posting runs one `DatabaseService.withTransaction` that:

1. locks the bill;
2. validates amounts / advance;
3. create+posts the AP journal in-session;
4. sets `journalEntryId` + `Posted` on the bill.

Audit remains outside the transaction (retry-safe).

## Database uniqueness

Partial unique index on journals:

`(sourceModule, sourceEntityType, sourceEntityId, postingPurpose)`

for draft/pending/posted, non-deleted rows with string source fields.

Bill journals use `postingPurpose = ap_recognition`.
Advance disbursement uses `advance_disbursement`.

**Deployment:** production disables automatic index creation. Run the duplicate
preflight and create this index through the controlled migration process before
relying on database-level uniqueness. Roll back by dropping only the unique
index and retaining the non-unique source index.

## Payment compatibility

Bill-linked payments **cannot** set TDS / retention / advanceRecovery / penalty.
Payment journal is Dr Contractor Payable / Cr Bank (plus on-account-only withholdings when no bill allocations).

## Reports verified (golden E2E)

- General ledger (contractor advance closing)
- Contractor ledger
- Trial balance
- Project cost sheet
- Partial then final payment against the same payable

## Legacy impact

No historical journals mutated. See `R-002A-legacy-deduction-reclassification-plan.md`.

## Remaining limitations

1. Typed `otherDeductions[]` array not introduced (scalar + dedicated COA category).
2. Material recovery is income-category recharge; not inventory issue accounting.
3. Retention release / bill reversal still not implemented.
4. Existing environments need COA seed for new categories before posting recoveries.
5. The source-purpose unique index still requires controlled production rollout.
