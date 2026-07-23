/**
 * Rename cost_centres codes to include CC / PC marker:
 *   LUX-{year}-{projectShort}-CC-{nnn}
 *   LUX-{year}-{projectShort}-PC-{nnn}
 *
 * Also rewrites project.financialConfig.costCentreCodes and profitCentreCode.
 *
 * Usage:
 *   DRY_RUN=1 node --env-file=apps/backend/.env.development.local \
 *     scripts/migrations/rename-cost-centre-codes-cc-pc.mjs
 *   DRY_RUN=0 node --env-file=apps/backend/.env.development.local \
 *     scripts/migrations/rename-cost-centre-codes-cc-pc.mjs
 */
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI;
const DRY_RUN = process.env.DRY_RUN !== '0';

if (!URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

function projectShortForm(projectName, projectCode) {
  const fromName = String(projectName ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6);
  if (fromName) return fromName;
  const fromCode = String(projectCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/^PRJ-?/i, '')
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6);
  return fromCode || 'GEN';
}

function yearOf(doc) {
  const d = doc.createdAt ? new Date(doc.createdAt) : new Date();
  const y = d.getFullYear();
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

function kindToken(kind) {
  return kind === 'profit_centre' ? 'PC' : 'CC';
}

function padSeq(n) {
  return String(Math.max(1, n)).padStart(3, '0');
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no writes' : 'APPLY — writing to MongoDB');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const centres = await db
    .collection('cost_centres')
    .find({ isDeleted: { $ne: true } })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  const projects = await db
    .collection('projects')
    .find({ isDeleted: { $ne: true } })
    .project({
      projectCode: 1,
      projectName: 1,
      financialConfig: 1,
    })
    .toArray();

  const projectById = new Map(projects.map((p) => [String(p._id), p]));

  /** prefix -> rows */
  const groups = new Map();
  for (const row of centres) {
    const project = row.projectId
      ? projectById.get(String(row.projectId))
      : null;
    const short = projectShortForm(
      project?.projectName,
      project?.projectCode,
    );
    const year = yearOf(row);
    const token = kindToken(row.kind);
    const prefix = `LUX-${year}-${short}-${token}`;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(row);
  }

  const renameMap = new Map();
  const plan = [];

  for (const [prefix, rows] of groups) {
    let seq = 1;
    for (const row of rows) {
      const newCode = `${prefix}-${padSeq(seq)}`;
      seq += 1;
      const oldCode = String(row.code ?? '').toUpperCase();
      renameMap.set(oldCode, newCode);
      plan.push({
        id: String(row._id),
        name: row.name,
        kind: row.kind,
        oldCode,
        newCode,
        unchanged: oldCode === newCode,
      });
    }
  }

  const changing = plan.filter((p) => !p.unchanged);
  console.log(
    `Centres: ${plan.length} total, ${changing.length} to rename, ${plan.length - changing.length} already ok`,
  );
  for (const row of plan) {
    console.log(
      row.unchanged
        ? `  KEEP  ${row.oldCode} (${row.name}) [${row.kind}]`
        : `  ${row.oldCode}  →  ${row.newCode}  (${row.name}) [${row.kind}]`,
    );
  }

  if (DRY_RUN) {
    console.log('\nRe-run with DRY_RUN=0 to apply.');
    await mongoose.disconnect();
    return;
  }

  for (const row of changing) {
    const temp = `TMP-${row.id}`.toUpperCase().slice(0, 40);
    await db.collection('cost_centres').updateOne(
      { _id: new mongoose.Types.ObjectId(row.id) },
      { $set: { code: temp, updatedAt: new Date() } },
    );
  }

  for (const row of changing) {
    await db.collection('cost_centres').updateOne(
      { _id: new mongoose.Types.ObjectId(row.id) },
      { $set: { code: row.newCode, updatedAt: new Date() } },
    );
  }

  let projectsUpdated = 0;
  for (const project of projects) {
    const fc = project.financialConfig ?? {};
    const codes = Array.isArray(fc.costCentreCodes) ? fc.costCentreCodes : [];
    const profit = fc.profitCentreCode
      ? String(fc.profitCentreCode).toUpperCase()
      : null;

    let changed = false;
    const nextCodes = codes.map((c) => {
      const key = String(c).toUpperCase();
      if (renameMap.has(key)) {
        changed = true;
        return renameMap.get(key);
      }
      return c;
    });
    let nextProfit = fc.profitCentreCode ?? null;
    if (profit && renameMap.has(profit)) {
      nextProfit = renameMap.get(profit);
      changed = true;
    }

    if (!changed) continue;
    await db.collection('projects').updateOne(
      { _id: project._id },
      {
        $set: {
          'financialConfig.costCentreCodes': nextCodes,
          'financialConfig.profitCentreCode': nextProfit,
          updatedAt: new Date(),
        },
      },
    );
    projectsUpdated += 1;
    console.log(`Project ${project.projectCode}: financialConfig codes updated`);
  }

  console.log(
    `\nDone. Renamed ${changing.length} centres; updated ${projectsUpdated} projects.`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
