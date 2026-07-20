# R-002 legacy reconciliation plan — Posted contractor bills without journals

## Objective

Identify and repair contractor running bills that are operationally `posted` / `paid` but lack a valid AP journal (`journalEntryId` null/missing), without inventing duplicate payables or disturbing settled payment history.

**Do not auto-backfill in application code.** Run as a controlled finance-approved remediation.

## 1. Discovery query

```javascript
// MongoDB shell / Compass
db.contractor_bills.find({
  isDeleted: { $ne: true },
  status: { $in: ['posted', 'paid'] },
  $or: [
    { journalEntryId: null },
    { journalEntryId: { $exists: false } },
  ],
}, {
  billNumber: 1,
  raNumber: 1,
  projectId: 1,
  contractorId: 1,
  agreementId: 1,
  status: 1,
  currentCertifiedValue: 1,
  retention: 1,
  tds: 1,
  advanceRecovery: 1,
  materialRecovery: 1,
  penalty: 1,
  otherDeductions: 1,
  netPayable: 1,
  paidAmount: 1,
  postedAt: 1,
  journalEntryId: 1,
}).sort({ postedAt: 1 });
```

Also search for orphan journals already linked by source (avoid double-create):

```javascript
db.journal_entries.find({
  sourceModule: 'contractor_bill',
  sourceEntityType: 'contractor_bill',
  sourceEntityId: { $in: /* bill ids from discovery */ },
  status: { $in: ['posted', 'draft'] },
});
```

## 2. Contractor / agreement confirmation

For each candidate bill:

1. Confirm contractor is active/verified and matches the agreement.
2. Confirm agreement belongs to the same project and covers the billed BOQ items.
3. Confirm measurements exist, are verified, and quantities match the bill lines.
4. Confirm certification / director approval timestamps are present.

## 3. Measurement / certification review

- Recalculate previous / current / cumulative quantities.
- Ensure no duplicate measurement IDs across other posted bills for the same agreement period.
- Escalate bills whose measurements were superseded by a later variation without approval evidence.

## 4. Gross and deduction recalculation

Authoritative formula:

```
netPayable =
  currentCertifiedValue
  − (advanceRecovery + materialRecovery + retention + tds + penalty + otherDeductions)
```

Reject remediation when stored `netPayable` / `cumulativeValue` do not reconcile within ₹0.01.

## 5. Payable-account confirmation

Resolve active COA categories used by current posting:

- Debit: `work_in_progress`
- Credits: `contractor_payable`, `retention_payable`, `tds_payable`, `other_income` (recoveries)

Confirm the same `contractor_payable` account is used by contractor payment journals for that company/environment.

## 6. Payment-history review (critical for paid bills)

For `status=paid` or `paidAmount > 0`:

1. List contractor payments allocating to the bill and their `journalEntryId`s.
2. Sum allocation amounts vs bill `paidAmount` / `netPayable`.
3. Inspect payment journal lines: debit must hit the same Contractor Payable account that the backfill journal will credit.
4. If payment journals already exist without a bill AP journal, prepare a paired remediation (bill AP + verify payment already cleared liability) so opening balances are not double-counted.
5. **Do not** create a new payable without reconciling the payment side.

## 7. Controlled journal backfill

For each approved eligible bill:

1. Dry-run: compute journal lines and expected trial-balance impact.
2. Finance sign-off on the dry-run report.
3. Create/post one journal with `sourceModule/sourceEntityType=contractor_bill` and `sourceEntityId=billId`.
4. Set `journalEntryId` on the bill; do not change historical `status` unless explicitly approved.
5. Write remediation audit evidence (see §10).

## 8. Duplicate prevention

- Unique business use of source entity + idempotency key `contractor-bill-journal:{billId}`.
- Before insert, re-query journals by source; reuse if found.
- Never create a second AP journal for the same bill id.

## 9. Finance approval

Required sign-offs before production write:

- CFO / Finance Director: dry-run totals by project
- Engineering: script/query review
- Change ticket linking discovery export and after-image

## 10. Audit evidence

Retain for each bill:

- bill id / number / RA
- contractor / project / agreement
- gross, retention, TDS, advance/material/penalty/other, net payable
- created or reused `journalEntryId`
- actor, timestamp, request/ticket id
- before/after bill snapshot (status + journalEntryId)
- exception notes for skipped bills

Do not log full bank account numbers or payment proof payloads.

## 11. Reversal strategy

If a backfilled journal is wrong:

1. Use journal reversal / correcting entry conventions already supported by `JournalService` (do not silently edit posted lines).
2. Clear or re-link `journalEntryId` only under finance approval.
3. Re-run discovery to confirm the bill is either correctly linked or explicitly deferred.

If bill-level reversal workflow is missing in the product, treat that as a follow-on defect; do not invent ad-hoc status flips during remediation.

## Exit criteria

- Zero `posted`/`paid` bills with null `journalEntryId` remain unexplained.
- Every remediated bill has a balanced journal and matching payment history.
- Contractor ledger and trial balance differences are explained and signed off.
