/**
 * Creates Atlas database `luxaria-developers` and all required collections.
 * Run: npx tsx src/setupAtlas.ts
 */
import mongoose from 'mongoose';
import { config } from './config';

const COLLECTIONS = [
  'companies',
  'users',
  'projects',
  'accounts',
  'ledgerentries',
  'contributions',
  'expenses',
  'pettycashfloats',
  'pettycashrequests',
  'vouchers',
  'auditfiles',
  'materials',
  'stockmovements',
  'vendors',
  'purchaserequests',
  'vendorbills',
  'payments',
  'labourcontracts',
  'attendances',
  'boqlines',
  'saleunits',
  'saleadvances',
  'clientinvoices',
  'notifications',
] as const;

async function main() {
  console.log('Connecting to Atlas…');
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  console.log('Database:', db.databaseName);

  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  for (const name of COLLECTIONS) {
    if (existing.has(name)) {
      console.log('  exists:', name);
    } else {
      await db.createCollection(name);
      console.log('  created:', name);
    }
  }

  // Marker doc so the DB folder always appears in Atlas UI
  await db.collection('_meta').updateOne(
    { key: 'luxaria-developers' },
    {
      $set: {
        key: 'luxaria-developers',
        company: 'Luxaria Developers Pvt Limited',
        createdAt: new Date(),
        collections: [...COLLECTIONS],
      },
    },
    { upsert: true }
  );

  console.log('\nDone. Atlas database "luxaria-developers" is ready.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
