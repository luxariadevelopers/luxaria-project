# SE — DPR unique index migration (pre–Phase 6)

**Date:** 2026-07-21  
**Collection:** `daily_progress_reports` (not `dailyprogressreports`)  
**Source of truth:** `apps/backend/src/modules/daily-progress-reports/schemas/daily-progress-report.schema.ts`

## Why

Phase 5 changed DPR uniqueness from **one per project+date** to **one non-deleted DPR per project + site + date + shift**. Production uses `autoIndex: false` — indexes must be applied via controlled migration, not app startup.

## Target indexes (must match schema)

| Name | Keys | Options |
|------|------|---------|
| `uniq_dpr_project_date` | `{ projectId: 1, reportDate: 1 }` | **Non-unique** (legacy name kept) |
| `uniq_dpr_project_site_date_shift` | `{ projectId: 1, siteId: 1, reportDate: 1, shift: 1 }` | **Unique**, partial: `isDeleted: false` and `siteId` is ObjectId |

**Do not** create `{ companyId, projectId, siteId, reportDate, shift }` — DPR documents are not keyed by `companyId` on this schema; company isolation is via project access (R-003).

## Pre-check (run before drop/create)

```javascript
// 1) Confirm collection name
db.getCollectionNames().filter((n) => /progress|dpr/i.test(n));

// 2) List existing indexes
db.daily_progress_reports.getIndexes();

// 3) Duplicate keys that would block the new unique index
db.daily_progress_reports.aggregate([
  {
    $match: {
      isDeleted: { $ne: true },
      siteId: { $type: 'objectId' },
    },
  },
  {
    $group: {
      _id: {
        projectId: '$projectId',
        siteId: '$siteId',
        reportDate: '$reportDate',
        shift: '$shift',
      },
      n: { $sum: 1 },
      ids: { $push: '$_id' },
    },
  },
  { $match: { n: { $gt: 1 } } },
]);
```

Resolve any duplicates before creating the unique index. Rows without `siteId` are excluded by the partial filter (legacy).

## Deployment order

1. Deploy Phase 5 application code (schema already declares the new indexes).  
2. Run pre-check; fix duplicates.  
3. Apply migration script (preferred) **or** ops steps below against each Mongo environment.  
4. Smoke: create two DPRs same project/date different `siteId` or `shift` → both succeed; same tuple → conflict.

### Controlled script

```bash
# From repo root — requires MONGODB_URI (or MONGO_URI)
node scripts/migrations/se-dpr-site-shift-unique-index.mjs --dry-run
node scripts/migrations/se-dpr-site-shift-unique-index.mjs --apply
```

### Manual equivalent (ops only if script unavailable)

```javascript
// Drop OLD unique project+date index if it still exists as unique
try {
  db.daily_progress_reports.dropIndex('uniq_dpr_project_date');
} catch (e) {
  // ignore if missing
}

// Recreate as non-unique (legacy name)
db.daily_progress_reports.createIndex(
  { projectId: 1, reportDate: 1 },
  { name: 'uniq_dpr_project_date' },
);

// Site-aware unique index
db.daily_progress_reports.createIndex(
  { projectId: 1, siteId: 1, reportDate: 1, shift: 1 },
  {
    unique: true,
    name: 'uniq_dpr_project_site_date_shift',
    partialFilterExpression: {
      isDeleted: false,
      siteId: { $type: 'objectId' },
    },
  },
);
```

## Rollback

```javascript
db.daily_progress_reports.dropIndex('uniq_dpr_project_site_date_shift');
// Optionally restore unique project+date ONLY if product reverts to one DPR/day/project
// (not recommended after Phase 5):
// db.daily_progress_reports.dropIndex('uniq_dpr_project_date');
// db.daily_progress_reports.createIndex(
//   { projectId: 1, reportDate: 1 },
//   { unique: true, name: 'uniq_dpr_project_date' },
// );
```

## Environments

Run against every MongoDB that holds production or staging Luxaria data (dev/staging/prod). Do not rely on `syncIndexes()` in production.
