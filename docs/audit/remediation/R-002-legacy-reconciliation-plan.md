# R-002 legacy contractor-bill reconciliation plan

## Objective

Reconcile contractor running bills that are marked `posted` (or `paid`) but do not have a linked AP journal entry. The required accounting outcome is a balanced `contractor_bill` journal: debit Work in Progress and credit Contractor Payable, Retention Payable, TDS Payable, and/or Other Income as applicable.

## Discovery

1. Export contractor bills in `posted` or `paid` status with a null or invalid `journalEntryId`.
2. Identify existing journal entries by `sourceModule=contractor_bill`, `sourceEntityType=contractor_bill`, and `sourceEntityId=bill._id` before creating any new entry.
3. Validate the bill arithmetic: certified value must equal net payable plus all deductions.
4. Confirm the project, contractor, agreement, financial year, and active posting-account mappings are available.

## Reconciliation procedure

1. Take an approved database backup and produce a review report grouped by project, contractor, bill number, and status.
2. For each eligible bill, create or reuse exactly one AP journal using the current posting rules and source identifiers.
3. Link the bill's `journalEntryId` to the posted journal, retaining the original bill status and recording a remediation audit entry.
4. Reconcile the generated journal totals to the bill and retain the report with the change ticket.

## Paid bills require special care

Do not blindly generate an AP bill journal for a paid bill. First verify that all contractor payments and their journals exist, their allocations equal the bill's `paidAmount`, and the resulting Contractor Payable balance will not be overstated. When a payment journal is missing, reconcile the AP bill and settlement journals together under controlled accounting review; do not mark the bill paid again or alter historical payment allocations.

## Controls

- Run in dry-run mode first and require Finance approval of exceptions.
- Use deterministic source fields and idempotency keys so retries cannot duplicate journals.
- Stop and escalate bills with invalid arithmetic, closed/locked periods, unavailable account mappings, or ambiguous payment history.
- Preserve before/after values, created journal IDs, operator, timestamp, and exception rationale in the remediation audit log.
