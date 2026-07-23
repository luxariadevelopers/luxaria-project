/**
 * Revoke `petty_cash.request` from system roles that are not site creators.
 * Keep create on SITE_SUPERVISOR / SITE_ENGINEER / SUPER_ADMIN.
 * Also ensures MD / Director have `petty_cash.approve` + `petty_cash.view`.
 *
 * Usage:
 *   DRY_RUN=1 node --env-file=apps/backend/.env.development.local \
 *     scripts/migrations/revoke-petty-cash-request-non-site.mjs
 *   DRY_RUN=0 node --env-file=apps/backend/.env.development.local \
 *     scripts/migrations/revoke-petty-cash-request-non-site.mjs
 */
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI;
const DRY_RUN = process.env.DRY_RUN !== '0';

const CREATOR_CODES = ['SITE_SUPERVISOR', 'SITE_ENGINEER', 'SUPER_ADMIN'];
const APPROVER_ENSURE = ['MANAGING_DIRECTOR', 'DIRECTOR'];

if (!URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

async function main() {
  await mongoose.connect(URI);
  const roles = mongoose.connection.collection('roles');

  const withRequest = await roles
    .find({
      isSystem: true,
      code: { $nin: CREATOR_CODES },
      permissions: 'petty_cash.request',
    })
    .project({ code: 1, name: 1, permissions: 1 })
    .toArray();

  console.log(
    `System roles with petty_cash.request (non-creators): ${withRequest.length}`,
  );
  for (const r of withRequest) {
    console.log(`  - ${r.code} (${r.name})`);
  }

  if (!DRY_RUN && withRequest.length > 0) {
    const pull = await roles.updateMany(
      {
        isSystem: true,
        code: { $nin: CREATOR_CODES },
        permissions: 'petty_cash.request',
      },
      { $pull: { permissions: 'petty_cash.request' } },
    );
    console.log(`Pulled petty_cash.request from ${pull.modifiedCount} role(s)`);
  }

  for (const code of APPROVER_ENSURE) {
    const role = await roles.findOne({ code }, { projection: { permissions: 1, name: 1 } });
    if (!role) {
      console.log(`Skip ensure: ${code} not found`);
      continue;
    }
    const perms = new Set(role.permissions ?? []);
    const missing = ['petty_cash.view', 'petty_cash.approve'].filter((p) => !perms.has(p));
    if (missing.length === 0) {
      console.log(`OK ${code}: already has view + approve`);
      continue;
    }
    console.log(`Ensure ${code}: add ${missing.join(', ')}`);
    if (!DRY_RUN) {
      await roles.updateOne(
        { code },
        { $addToSet: { permissions: { $each: missing } } },
      );
    }
  }

  const creators = await roles
    .find({ code: { $in: CREATOR_CODES } })
    .project({ code: 1, permissions: 1 })
    .toArray();
  for (const r of creators) {
    const has = (r.permissions ?? []).includes('petty_cash.request');
    console.log(
      `${has ? 'OK' : 'MISSING'} ${r.code}: petty_cash.request ${has ? 'present' : 'absent'}`,
    );
    if (!DRY_RUN && !has && r.code !== 'SUPER_ADMIN') {
      await roles.updateOne(
        { code: r.code },
        {
          $addToSet: {
            permissions: {
              $each: ['cash.view', 'petty_cash.view', 'petty_cash.request'],
            },
          },
        },
      );
      console.log(`  -> granted cash.view + petty_cash.view/request`);
    }
  }

  console.log(DRY_RUN ? 'DRY_RUN=1 — no writes' : 'Done');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
