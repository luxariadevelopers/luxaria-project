/**
 * Move jenigoldjeni@gmail.com (display name Managing Director) from SUPER_ADMIN
 * to MANAGING_DIRECTOR so petty_cash.request / create UI is not granted via bypass.
 *
 * Usage:
 *   DRY_RUN=1 node --env-file=apps/backend/.env.development.local \
 *     scripts/migrations/assign-managing-director-role.mjs
 *   DRY_RUN=0 node --env-file=apps/backend/.env.development.local \
 *     scripts/migrations/assign-managing-director-role.mjs
 */
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI;
const DRY_RUN = process.env.DRY_RUN !== '0';
const EMAIL = process.env.TARGET_EMAIL || 'jenigoldjeni@gmail.com';

if (!URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

async function main() {
  await mongoose.connect(URI);
  const users = mongoose.connection.collection('users');
  const roles = mongoose.connection.collection('roles');

  const user = await users.findOne({ email: EMAIL });
  const md = await roles.findOne({ code: 'MANAGING_DIRECTOR' });
  const sa = await roles.findOne({ code: 'SUPER_ADMIN' });

  if (!user) throw new Error(`User not found: ${EMAIL}`);
  if (!md) throw new Error('MANAGING_DIRECTOR role missing');

  const current = await roles
    .find({ _id: { $in: user.roleIds || [] } })
    .project({ code: 1, bypassPermissions: 1 })
    .toArray();

  console.log('User', user.email, user.fullName);
  console.log(
    'Current roles:',
    current.map((r) => `${r.code}${r.bypassPermissions ? ' (bypass)' : ''}`),
  );

  if (DRY_RUN) {
    console.log(`DRY_RUN=1 — would set roleIds to [${md.code}]`);
  } else {
    await users.updateOne({ _id: user._id }, { $set: { roleIds: [md._id] } });
    console.log(`Updated roleIds → ${md.code} (was SUPER_ADMIN=${!!sa})`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
