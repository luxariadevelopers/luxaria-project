# R-002A legacy deduction reclassification plan

## Objective

Correct historical contractor-bill AP journals that credited **Other Income** for mobilisation advance recovery, material recovery, penalty, and/or other deductions, without silently mutating original posted journals.

## Discovery

```javascript
// Posted contractor-bill journals with Other Income credit lines
db.journal_entries.aggregate([
  {
    $match: {
      sourceModule: 'contractor_bill',
      status: 'posted',
      isDeleted: { $ne: true },
    },
  },
  { $unwind: '$lines' },
  {
    $lookup: {
      from: 'accounts',
      localField: 'lines.accountId',
      foreignField: '_id',
      as: 'acct',
    },
  },
  { $unwind: '$acct' },
  { $match: { 'acct.accountCategory': 'other_income' } },
  {
    $group: {
      _id: '$_id',
      journalNumber: { $first: '$journalNumber' },
      sourceEntityId: { $first: '$sourceEntityId' },
      otherIncomeCredit: { $sum: '$lines.credit' },
    },
  },
]);
```

Join to `contractor_bills` for `advanceRecovery`, `materialRecovery`, `penalty`, `otherDeductions`.

## Procedure

1. Export candidates; reconcile each bill’s deduction split to the Other Income credit total.
2. Identify mobilisation advance disbursements (agreement `advanceDisbursementJournalId` or manual opening journals). If missing, finance must approve an opening Contractor Advance balance before reclassifying recovery out of income.
3. For each approved case, post a **reclassification journal** (do not edit the original):
   - Dr Other Income (amounts previously misclassified)
   - Cr Contractor Advance / Material Recovery / Penalty Recovery / Other Contractor Deduction per split
4. Reconcile contractor ledger, advance GL, trial balance, and agreement remaining advance.
5. Tax-impact review (income previously overstated).
6. Finance Director sign-off; retain before/after evidence.

## Controls

- No silent update of historical posted journals.
- Prefer reversing/reclass entries under existing JournalService rules.
- Paid bills: ensure payable and payment journals remain aligned after reclass (reclass should not touch Contractor Payable if net was already correct).
- Rollback: reverse the reclassification journal.

## Exit criteria

- No unexplained Other Income credits remain for contractor_bill recoveries.
- Contractor Advance GL reconciles to agreement outstanding.
- Trial balance balanced; tax memo filed.
