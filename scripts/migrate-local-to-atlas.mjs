/**
 * One-shot: copy missing business docs from local Docker Mongo → Atlas.
 * Usage (from backend container):
 *   LOCAL_MONGODB_URI=... MONGODB_URI=... node /scripts/migrate-local-to-atlas.mjs
 */
import mongoose from 'mongoose';

const LOCAL_URI =
  process.env.LOCAL_MONGODB_URI ||
  'mongodb://mongo:27017/luxaria-erp?directConnection=true';
const ATLAS_URI = process.env.MONGODB_URI;

if (!ATLAS_URI) {
  console.error('MONGODB_URI (Atlas) is required');
  process.exit(1);
}

/** Collections that had local data missing on Atlas (from inventory). */
const COLLECTIONS = [
  'projects',
  'project_sites',
  'company_bank_accounts',
  'journal_entries',
  'labour_categories',
  'project_assignments',
  'site_assignments',
  'idempotency_keys',
  'counters',
];

async function migrateCollection(localDb, atlasDb, name) {
  const localCol = localDb.collection(name);
  const atlasCol = atlasDb.collection(name);
  const docs = await localCol.find({}).toArray();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const existing = await atlasCol.findOne({ _id: doc._id });
    if (!existing) {
      await atlasCol.insertOne(doc);
      inserted += 1;
      continue;
    }
    // Counters: keep the higher sequence so numbering does not rewind.
    if (name === 'counters') {
      const localSeq = Number(doc.seq ?? doc.value ?? doc.current ?? 0);
      const atlasSeq = Number(
        existing.seq ?? existing.value ?? existing.current ?? 0,
      );
      if (localSeq > atlasSeq) {
        await atlasCol.replaceOne({ _id: doc._id }, doc);
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    skipped += 1;
  }

  return { name, local: docs.length, inserted, updated, skipped };
}

async function main() {
  const localConn = await mongoose
    .createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 30000 })
    .asPromise();
  const atlasConn = await mongoose
    .createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 30000 })
    .asPromise();

  const localDb = localConn.db;
  const atlasDb = atlasConn.db;

  console.log('LOCAL=', localDb.databaseName);
  console.log('ATLAS=', atlasDb.databaseName);

  const results = [];
  for (const name of COLLECTIONS) {
    const result = await migrateCollection(localDb, atlasDb, name);
    results.push(result);
    console.log(
      `${name}: local=${result.local} inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped}`,
    );
  }

  // Verify key collections after migrate
  const verify = {};
  for (const name of [
    'projects',
    'project_sites',
    'company_bank_accounts',
    'journal_entries',
    'labour_categories',
  ]) {
    verify[name] = {
      local: await localDb.collection(name).countDocuments(),
      atlas: await atlasDb.collection(name).countDocuments(),
    };
  }
  console.log('VERIFY', JSON.stringify(verify, null, 2));

  const insertedTotal = results.reduce((s, r) => s + r.inserted, 0);
  const updatedTotal = results.reduce((s, r) => s + r.updated, 0);
  console.log(`DONE inserted=${insertedTotal} updated=${updatedTotal}`);

  await localConn.close();
  await atlasConn.close();
}

main().catch((err) => {
  console.error('MIGRATE_FAIL', err);
  process.exit(1);
});
