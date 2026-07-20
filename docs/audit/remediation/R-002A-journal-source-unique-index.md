# R-002A journal source unique index

## Definition

Partial unique index on `journal_entries`:

- Keys: `sourceModule`, `sourceEntityType`, `sourceEntityId`, `postingPurpose`
- Filter: all four are strings; `isDeleted: false`; `status ∈ {draft, pending_approval, posted}`

## Pre-check

```javascript
db.journal_entries.aggregate([
  {
    $match: {
      sourceModule: { $type: 'string' },
      sourceEntityType: { $type: 'string' },
      sourceEntityId: { $type: 'string' },
      postingPurpose: { $type: 'string' },
      isDeleted: { $ne: true },
      status: { $in: ['draft', 'pending_approval', 'posted'] },
    },
  },
  {
    $group: {
      _id: {
        sourceModule: '$sourceModule',
        sourceEntityType: '$sourceEntityType',
        sourceEntityId: '$sourceEntityId',
        postingPurpose: '$postingPurpose',
      },
      n: { $sum: 1 },
      ids: { $push: '$_id' },
    },
  },
  { $match: { n: { $gt: 1 } } },
]);
```

Resolve duplicates before deploy.

## Deployment order

1. Run pre-check / resolve duplicates.
2. Deploy application that writes `postingPurpose`.
3. Create the named unique index through the controlled production migration
   process. Production uses `autoIndex: false`; do not rely on application
   startup or `syncIndexes()`.
4. Smoke-test contractor bill post + advance disbursement.

## Rollback

Drop the unique index; retain the non-unique source triple index.
