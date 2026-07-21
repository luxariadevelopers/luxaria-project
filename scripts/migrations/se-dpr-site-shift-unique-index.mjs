#!/usr/bin/env node
/**
 * Controlled migration: Phase 5 DPR uniqueness
 *   old unique (projectId, reportDate) → non-unique same name
 *   + unique (projectId, siteId, reportDate, shift) partial
 *
 * Collection / index names MUST match:
 *   apps/backend/src/modules/daily-progress-reports/schemas/daily-progress-report.schema.ts
 *
 * Usage:
 *   MONGODB_URI=... node scripts/migrations/se-dpr-site-shift-unique-index.mjs --dry-run
 *   MONGODB_URI=... node scripts/migrations/se-dpr-site-shift-unique-index.mjs --apply
 *
 * Docs: docs/audit/site-execution/SE-dpr-index-migration.md
 */

import { MongoClient } from 'mongodb';

const COLLECTION = 'daily_progress_reports';
const LEGACY_INDEX = 'uniq_dpr_project_date';
const SITE_SHIFT_INDEX = 'uniq_dpr_project_site_date_shift';

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  '';

const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run') || !apply;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

async function listIndexes(col) {
  return col.indexes();
}

async function findSiteShiftDuplicates(col) {
  return col
    .aggregate([
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
    ])
    .toArray();
}

async function main() {
  if (!uri) {
    fail('Set MONGODB_URI (or MONGO_URI / DATABASE_URL)');
  }

  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`Collection: ${COLLECTION}`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const col = db.collection(COLLECTION);

  const names = await db.listCollections({ name: COLLECTION }).toArray();
  if (names.length === 0) {
    await client.close();
    fail(`Collection ${COLLECTION} not found`);
  }

  const indexes = await listIndexes(col);
  console.log(
    'Current indexes:',
    indexes.map((i) => `${i.name}${i.unique ? ' (unique)' : ''}`).join(', '),
  );

  const duplicates = await findSiteShiftDuplicates(col);
  if (duplicates.length > 0) {
    console.error(
      `Found ${duplicates.length} duplicate (projectId,siteId,reportDate,shift) groups:`,
    );
    for (const d of duplicates.slice(0, 20)) {
      console.error(JSON.stringify(d));
    }
    await client.close();
    fail('Resolve duplicates before applying unique index');
  }
  console.log('Pre-check: no site/shift duplicates');

  const legacy = indexes.find((i) => i.name === LEGACY_INDEX);
  const siteShift = indexes.find((i) => i.name === SITE_SHIFT_INDEX);

  if (dryRun) {
    if (legacy?.unique) {
      console.log(
        `Would drop unique ${LEGACY_INDEX} and recreate as non-unique { projectId, reportDate }`,
      );
    } else if (!legacy) {
      console.log(
        `Would create non-unique ${LEGACY_INDEX} { projectId, reportDate }`,
      );
    } else {
      console.log(`${LEGACY_INDEX} already non-unique — no change`);
    }

    if (!siteShift) {
      console.log(
        `Would create unique ${SITE_SHIFT_INDEX} { projectId, siteId, reportDate, shift } partial`,
      );
    } else if (!siteShift.unique) {
      console.log(
        `Would rebuild ${SITE_SHIFT_INDEX} as unique (currently non-unique)`,
      );
    } else {
      console.log(`${SITE_SHIFT_INDEX} already present as unique — no change`);
    }
    await client.close();
    console.log('Dry-run complete. Re-run with --apply to mutate indexes.');
    return;
  }

  // APPLY
  if (legacy?.unique) {
    console.log(`Dropping unique ${LEGACY_INDEX}...`);
    await col.dropIndex(LEGACY_INDEX);
  }
  if (!legacy || legacy.unique) {
    console.log(`Creating non-unique ${LEGACY_INDEX}...`);
    await col.createIndex(
      { projectId: 1, reportDate: 1 },
      { name: LEGACY_INDEX },
    );
  }

  if (siteShift && !siteShift.unique) {
    console.log(`Dropping non-unique ${SITE_SHIFT_INDEX} before unique create...`);
    await col.dropIndex(SITE_SHIFT_INDEX);
  }
  if (!siteShift || !siteShift.unique) {
    console.log(`Creating unique ${SITE_SHIFT_INDEX}...`);
    await col.createIndex(
      { projectId: 1, siteId: 1, reportDate: 1, shift: 1 },
      {
        unique: true,
        name: SITE_SHIFT_INDEX,
        partialFilterExpression: {
          isDeleted: false,
          siteId: { $type: 'objectId' },
        },
      },
    );
  }

  const after = await listIndexes(col);
  console.log(
    'Indexes after apply:',
    after.map((i) => `${i.name}${i.unique ? ' (unique)' : ''}`).join(', '),
  );
  await client.close();
  console.log('Migration applied successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
