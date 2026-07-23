/**
 * Rename existing cost_centres codes to:
 *   LUX-{year}-{projectShort}-{nnn}
 * Example: LUX-2026-MADAMB-001
 *
 * Also rewrites project.financialConfig.costCentreCodes string refs.
 *
 * Usage (from repo root):
 *   node --env-file=apps/backend/.env.development.local \
 *     scripts/migrations/rename-cost-centre-codes-lux.mjs
 *
 * Dry run (default):
 *   DRY_RUN=1 node --env-file=... scripts/migrations/rename-cost-centre-codes-lux.mjs
 *
 * Apply:
 *   DRY_RUN=0 node --env-file=... scripts/migrations/rename-cost-centre-codes-lux.mjs
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
    .project({ projectCode: 1, projectName: 1, financialConfig: 1 })
    .toArray();

  const projectById = new Map(projects.map((p) => [String(p._id), p]));

  /** @type {Map<string, typeof centres>} */
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
    const prefix = `LUX-${year}-${short}`;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(row);
  }

  /** oldCode -> newCode */
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
        ? `  KEEP  ${row.oldCode} (${row.name})`
        : `  ${row.oldCode}  →  ${row.newCode}  (${row.name})`,
    );
  }

  if (DRY_RUN) {
    console.log('\nRe-run with DRY_RUN=0 to apply.');
    await mongoose.disconnect();
    return;
  }

  // Phase 1: unique-safe temp codes
  for (const row of changing) {
    const temp = `TMP-${row.id}`.toUpperCase().slice(0, 40);
    await db.collection('cost_centres').updateOne(
      { _id: new mongoose.Types.ObjectId(row.id) },
      { $set: { code: temp, updatedAt: new Date() } },
    );
  }

  // Phase 2: final codes
  for (const row of changing) {
    await db.collection('cost_centres').updateOne(
      { _id: new mongoose.Types.ObjectId(row.id) },
      { $set: { code: row.newCode, updatedAt: new Date() } },
    );
  }

  // Rewrite project financialConfig.costCentreCodes
  let projectsUpdated = 0;
  for (const project of projects) {
    const codes = project.financialConfig?.costCentreCodes;
    if (!Array.isArray(codes) || codes.length === 0) continue;
    let changed = false;
    const next = codes.map((c) => {
      const key = String(c).toUpperCase();
      if (renameMap.has(key)) {
        changed = true;
        return renameMap.get(key);
      }
      return c;
    });
    if (!changed) continue;
    await db.collection('projects').updateOne(
      { _id: project._id },
      {
        $set: {
          'financialConfig.costCentreCodes': next,
          updatedAt: new Date(),
        },
      },
    );
    projectsUpdated += 1;
    console.log(
      `Project ${project.projectCode}: costCentreCodes updated`,
      codes,
      '→',
      next,
    );
  }

  console.log(
    `\nDone. Renamed ${changing.length} cost centres; updated ${projectsUpdated} projects.`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
