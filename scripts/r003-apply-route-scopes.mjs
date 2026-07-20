#!/usr/bin/env node
/**
 * R-003: Apply class-level route scope decorators to Nest controllers.
 * Idempotent — skips files that already import from route-scope.decorator.
 *
 * Usage: node scripts/r003-apply-route-scopes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.join(root, 'apps/backend/src/modules');

/** @typedef {'global'|'project'|'investor'|'mixed'|'skip'} Scope */

/**
 * Module folder → default class scope.
 * `mixed` / `skip` are handled manually (or already decorated).
 */
const MODULE_SCOPE = {
  auth: 'skip', // @Public on login/refresh; SkipPermissions elsewhere
  health: 'skip', // @Public
  version: 'skip', // @Public
  users: 'global',
  rbac: 'global',
  company: 'global',
  'chart-of-accounts': 'global',
  'financial-year': 'global',
  'accounting-period-closure': 'global',
  'expense-categories': 'global',
  'labour-categories': 'global',
  'material-master': 'global',
  vendors: 'global',
  contractors: 'global',
  directors: 'global',
  investors: 'global',
  notifications: 'global',
  'audit-log': 'global',
  'daily-director-digest': 'global',
  'company-bank-accounts': 'global',
  'project-access': 'skip', // mixed — me/assignments global; check/* project
  projects: 'skip', // mixed — list filter, :id project
  'investor-portal': 'skip', // mixed investor + staff manage
  'finance-dashboard': 'project',
  'director-command-centre': 'global',
  'project-dashboard': 'project',
  'purchase-orders': 'project',
  'purchase-requests': 'project',
  'goods-receipts': 'project',
  'vendor-invoices': 'project',
  'vendor-payments': 'project',
  'vendor-quotations': 'project',
  'quotation-comparisons': 'project',
  journal: 'project',
  'contribution-receipts': 'project',
  'contractor-bills': 'project',
  'contractor-payments': 'project',
  'contractor-agreements': 'project',
  'work-measurements': 'project',
  bookings: 'project',
  'booking-cancellations': 'project',
  'customer-receipts': 'project',
  'payment-schedules': 'project',
  units: 'project',
  customers: 'global',
  documents: 'project',
  approvals: 'project',
  boq: 'project',
  'stock-counts': 'project',
  'stock-ledger': 'project',
  'stock-reorder': 'project',
  'material-issues': 'project',
  'material-consumption': 'project',
  'material-consumption-standards': 'project',
  'daily-progress-reports': 'project',
  'labour-attendance': 'project',
  'petty-cash-requirements': 'project',
  'petty-cash-fund-transfers': 'project',
  'site-expense-vouchers': 'project',
  'signed-payment-vouchers': 'project',
  'project-participants': 'project',
  'project-commitments': 'project',
  'quality-inspections': 'project',
  'manpower-planning': 'project',
  'cash-accounts': 'project',
  'bank-reconciliation': 'global',
  'construction-reports': 'project',
  'accounting-reports': 'project',
};

/** Resource type for project-scoped modules (resource-by-id). */
const RESOURCE_TYPE = {
  'purchase-orders': 'purchase-order',
  'purchase-requests': 'purchase-request',
  'goods-receipts': 'goods-receipt',
  'vendor-invoices': 'vendor-invoice',
  'vendor-payments': 'vendor-payment',
  'vendor-quotations': 'vendor-quotation',
  'quotation-comparisons': 'quotation-comparison',
  journal: 'journal',
  'contribution-receipts': 'contribution-receipt',
  'contractor-bills': 'contractor-bill',
  'contractor-payments': 'contractor-payment',
  'contractor-agreements': 'contractor-agreement',
  'work-measurements': 'work-measurement',
  bookings: 'booking',
  'booking-cancellations': 'booking-cancellation',
  'customer-receipts': 'customer-receipt',
  'payment-schedules': 'payment-schedule',
  units: 'unit',
  documents: 'document',
  approvals: 'approval',
  boq: 'boq',
  'stock-counts': 'stock-count',
  'material-issues': 'material-issue',
  'material-consumption': 'material-consumption',
  'daily-progress-reports': 'dpr',
  'labour-attendance': 'labour-attendance',
  'petty-cash-requirements': 'petty-cash-requirement',
  'site-expense-vouchers': 'site-expense-voucher',
  'signed-payment-vouchers': 'signed-payment-voucher',
  'project-participants': 'project-participant',
  'project-commitments': 'project-commitment',
  'quality-inspections': 'quality-inspection',
  'manpower-planning': 'manpower-shortfall',
  'cash-accounts': 'cash-account',
  'project-dashboard': null, // uses :projectId
  'finance-dashboard': null,
  'construction-reports': null,
  'accounting-reports': null,
  'stock-ledger': null,
  'stock-reorder': null,
  'material-consumption-standards': null,
  'petty-cash-fund-transfers': null,
};

function findControllers(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findControllers(full));
    } else if (entry.name.endsWith('.controller.ts')) {
      out.push(full);
    }
  }
  return out;
}

function moduleNameFromPath(filePath) {
  const rel = path.relative(modulesDir, filePath);
  return rel.split(path.sep)[0];
}

function decoratorImportPath(filePath) {
  const dir = path.dirname(filePath);
  const target = path.join(
    modulesDir,
    'project-access/decorators/route-scope.decorator',
  );
  let rel = path.relative(dir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function buildDecorator(moduleName, scope) {
  if (scope === 'global') {
    return '@GlobalScope()';
  }
  if (scope === 'investor') {
    return '@InvestorScoped({ mode: \'filter\' })';
  }
  const resourceType = RESOURCE_TYPE[moduleName];
  if (resourceType) {
    return `@ProjectScoped({\n  mode: 'filter',\n  resource: { resourceType: '${resourceType}', idParam: 'id' },\n  operation: 'read',\n})`;
  }
  // projectId in path/query/body/header; lists use filter mode
  return `@ProjectScoped({\n  mode: 'filter',\n  operation: 'read',\n})`;
}

function buildImport(scope, importPath) {
  if (scope === 'global') {
    return `import { GlobalScope } from '${importPath}';\n`;
  }
  if (scope === 'investor') {
    return `import { InvestorScoped } from '${importPath}';\n`;
  }
  return `import { ProjectScoped } from '${importPath}';\n`;
}

function applyToFile(filePath) {
  const moduleName = moduleNameFromPath(filePath);
  const scope = MODULE_SCOPE[moduleName];
  if (!scope || scope === 'skip' || scope === 'mixed') {
    return { filePath, status: 'skipped', moduleName, scope };
  }

  let source = fs.readFileSync(filePath, 'utf8');
  if (
    source.includes('route-scope.decorator') ||
    source.includes('@GlobalScope(') ||
    source.includes('@ProjectScoped(') ||
    source.includes('@InvestorScoped(')
  ) {
    return { filePath, status: 'already', moduleName, scope };
  }

  const importPath = decoratorImportPath(filePath);
  const importLine = buildImport(scope, importPath).trimEnd();
  const decorator = buildDecorator(moduleName, scope);

  // Insert import after last import block
  const importMatches = [...source.matchAll(/^import .+;$/gm)];
  if (importMatches.length === 0) {
    return { filePath, status: 'error-no-import', moduleName, scope };
  }
  const lastImport = importMatches[importMatches.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;
  source =
    source.slice(0, insertAt) + '\n' + importLine + source.slice(insertAt);

  // Re-locate controller cluster after import insertion
  const ctrlIdx = source.search(/@Controller\(/);
  if (ctrlIdx === -1) {
    return { filePath, status: 'error-no-controller', moduleName, scope };
  }

  const before = source.slice(0, ctrlIdx);
  const apiTagsIdx = before.lastIndexOf('@ApiTags');
  const apiBearerIdx = before.lastIndexOf('@ApiBearerAuth');
  const candidates = [apiTagsIdx, apiBearerIdx, ctrlIdx].filter((i) => i >= 0);
  const insertIdx = Math.min(...candidates);

  source =
    source.slice(0, insertIdx) + decorator + '\n' + source.slice(insertIdx);

  fs.writeFileSync(filePath, source);
  return { filePath, status: 'applied', moduleName, scope };
}

const controllers = findControllers(modulesDir);
const results = controllers.map(applyToFile);

const applied = results.filter((r) => r.status === 'applied');
const skipped = results.filter((r) => r.status === 'skipped');
const already = results.filter((r) => r.status === 'already');
const errors = results.filter((r) => r.status.startsWith('error'));

console.log(
  JSON.stringify(
    {
      total: results.length,
      applied: applied.length,
      already: already.length,
      skipped: skipped.length,
      errors: errors.length,
      errorFiles: errors,
      skippedModules: [...new Set(skipped.map((s) => s.moduleName))],
    },
    null,
    2,
  ),
);
