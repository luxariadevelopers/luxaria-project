#!/usr/bin/env node
/**
 * Micro Phase 001 — regenerate API / UI contract inventories.
 *
 * Usage (from repo root):
 *   node scripts/audit-api-contracts.mjs
 *
 * Writes:
 *   docs/inventories/api-audit.json
 *   docs/inventories/route-inventory.json
 *   docs/inventories/permission-inventory.md
 *   docs/inventories/status-enum-inventory.md
 *   docs/ui-api-matrix.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const BACKEND_SRC = path.join(ROOT, 'apps/backend/src');
const MODULES_DIR = path.join(BACKEND_SRC, 'modules');
const DOCS_API = path.join(ROOT, 'apps/backend/docs');
const OUT_DIR = path.join(ROOT, 'docs/inventories');

const PUBLIC_MODULES = new Set(['health', 'version']);
const AUTH_PUBLIC_PATHS = new Set([
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',
]);

/** @type {Record<string, string>} */
const MODULE_API_DOC = {
  auth: 'AUTH_API.md',
  rbac: 'RBAC_API.md',
  users: 'USERS_API.md',
  company: 'COMPANY_API.md',
  'financial-year': 'FINANCIAL_YEAR_API.md',
  projects: 'PROJECTS_API.md',
  'project-access': 'PROJECT_ACCESS_API.md',
  'project-participants': 'PROJECT_PARTICIPANTS_API.md',
  'project-commitments': 'PROJECT_COMMITMENTS_API.md',
  'contribution-receipts': 'CONTRIBUTION_RECEIPTS_API.md',
  directors: 'DIRECTORS_API.md',
  investors: 'INVESTORS_API.md',
  documents: 'DOCUMENTS_S3_API.md',
  approvals: 'APPROVALS_API.md',
  'audit-log': 'AUDIT_LOG_API.md',
  'chart-of-accounts': 'CHART_OF_ACCOUNTS_API.md',
  journal: 'JOURNAL_API.md',
  'company-bank-accounts': 'COMPANY_BANK_ACCOUNTS_API.md',
  'cash-accounts': 'CASH_ACCOUNTS_API.md',
  'expense-categories': 'EXPENSE_CATEGORIES_API.md',
  'petty-cash-requirements': 'PETTY_CASH_REQUIREMENTS_API.md',
  'petty-cash-fund-transfers': 'PETTY_CASH_FUND_TRANSFERS_API.md',
  'site-expense-vouchers': 'SITE_EXPENSE_VOUCHERS_API.md',
  'signed-payment-vouchers': 'SIGNED_PAYMENT_VOUCHERS_API.md',
  vendors: 'VENDORS_API.md',
  'material-master': 'MATERIALS_API.md',
  'purchase-requests': 'PURCHASE_REQUESTS_API.md',
  'vendor-quotations': 'VENDOR_QUOTATIONS_API.md',
  'quotation-comparisons': 'QUOTATION_COMPARISONS_API.md',
  'purchase-orders': 'PURCHASE_ORDERS_API.md',
  'goods-receipts': 'GOODS_RECEIPTS_API.md',
  'quality-inspections': 'QUALITY_INSPECTIONS_API.md',
  'vendor-invoices': 'VENDOR_INVOICES_API.md',
  'vendor-payments': 'VENDOR_PAYMENTS_API.md',
  'stock-ledger': 'STOCK_LEDGER_API.md',
  'stock-counts': 'STOCK_COUNTS_API.md',
  'stock-reorder': 'STOCK_REORDER_API.md',
  'material-issues': 'MATERIAL_ISSUES_API.md',
  'material-consumption': 'MATERIAL_CONSUMPTION_API.md',
  'material-consumption-standards': 'MATERIAL_CONSUMPTION_STANDARDS_API.md',
  boq: 'BOQ_API.md',
  'daily-progress-reports': 'DPR_API.md',
  'work-measurements': 'WORK_MEASUREMENTS_API.md',
  contractors: 'CONTRACTORS_API.md',
  'contractor-agreements': 'CONTRACTOR_AGREEMENTS_API.md',
  'contractor-bills': 'CONTRACTOR_BILLS_API.md',
  'contractor-payments': 'CONTRACTOR_PAYMENTS_API.md',
  'labour-categories': 'LABOUR_CATEGORIES_API.md',
  'labour-attendance': 'LABOUR_ATTENDANCE_API.md',
  'manpower-planning': 'MANPOWER_PLANNING_API.md',
  units: 'UNITS_API.md',
};

/**
 * @param {string} dir
 * @param {(p: string) => boolean} [pred]
 */
function walk(dir, pred = () => true) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
}

/** @param {string} src */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** @param {string} src */
function extractControllerBase(src) {
  const m = src.match(/@Controller\(\s*(?:'([^']*)'|"([^"]*)")?\s*\)/);
  if (!m) return '';
  return m[1] ?? m[2] ?? '';
}

/** @param {string} src */
function extractApiTags(src) {
  const m = src.match(/@ApiTags\(\s*'([^']+)'/);
  return m ? m[1] : null;
}

/**
 * @param {string} src
 * @param {string} controllerBase
 */
function extractRoutes(src, controllerBase) {
  const clean = stripComments(src);
  /** @type {Array<Record<string, unknown>>} */
  const routes = [];
  const methodRe =
    /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)'|"([^"]*)")?\s*\)/g;
  let match;
  while ((match = methodRe.exec(clean)) !== null) {
    const httpMethod = match[1].toUpperCase();
    const sub = match[2] ?? match[3] ?? '';
    const start = match.index;
    const window = clean.slice(start, start + 1400);
    const permMatch = window.match(/@RequirePermissions\(\s*([\s\S]*?)\)/);
    /** @type {string[]} */
    let permissions = [];
    if (permMatch) {
      permissions = [...permMatch[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    }
    const skipPermissions = /@SkipPermissions\(/.test(window.slice(0, 500));
    const summaryMatch = window.match(
      /@ApiOperation\(\s*\{[\s\S]*?summary:\s*'([^']*)'/,
    );
    const summary = summaryMatch ? summaryMatch[1] : '';
    const afterDecorators = window.replace(/@[\w.]+\([\s\S]*?\)/g, '').trim();
    const fnMatch = afterDecorators.match(/(?:async\s+)?([A-Za-z_]\w*)\s*\(/);
    const handler = fnMatch ? fnMatch[1] : 'unknown';

    const parts = [controllerBase, sub]
      .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
      .filter(Boolean);
    const fullPath = '/api/v1' + (parts.length ? `/${parts.join('/')}` : '');

    routes.push({
      method: httpMethod,
      path: fullPath,
      controllerPath: controllerBase || '(root)',
      subPath: sub,
      handler,
      permissions,
      skipPermissions,
      summary,
      hasApiOperation: Boolean(summaryMatch),
      responseShape:
        'ApiSuccessResponse { success: true, message: string, data: T, meta?: object }',
    });
  }
  return routes;
}

/**
 * @param {string[]} files
 * @returns {Array<{ method: string; path: string; file: string }>}
 */
function extractClientCalls(files) {
  /** @type {Array<{ method: string; path: string; file: string }>} */
  const calls = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    const patterns = [
      /api(?:Get|Post|Put|Patch|Delete)<[^>]*>\(\s*[`'"]([^`'"]+)[`'"]/g,
      /api(?:Get|Post|Put|Patch|Delete)\(\s*[`'"]([^`'"]+)[`'"]/g,
      /apiClient\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/gi,
      /endpoint:\s*[`'"]([^`'"]+)[`'"]/g,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(src)) !== null) {
        if (re.source.startsWith('apiClient')) {
          calls.push({
            method: String(m[1]).toUpperCase(),
            path: m[2],
            file: rel,
          });
        } else if (re.source.startsWith('endpoint')) {
          calls.push({ method: 'POST?', path: m[1], file: rel });
        } else {
          const fn = src
            .slice(Math.max(0, m.index - 40), m.index + 20)
            .match(/api(Get|Post|Put|Patch|Delete)/i);
          const method = fn ? fn[1].toUpperCase().replace('GET', 'GET') : 'GET';
          const methodMap = {
            GET: 'GET',
            POST: 'POST',
            PUT: 'PUT',
            PATCH: 'PATCH',
            DELETE: 'DELETE',
          };
          calls.push({
            method: methodMap[method] ?? method,
            path: m[1],
            file: rel,
          });
        }
      }
    }
  }
  // Deduplicate
  const seen = new Set();
  return calls.filter((c) => {
    const k = `${c.method} ${c.path} ${c.file}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function buildInventory() {
  const apiDocs = fs.existsSync(DOCS_API)
    ? fs.readdirSync(DOCS_API).filter((f) => f.endsWith('.md'))
    : [];

  const controllers = walk(MODULES_DIR, (p) => p.endsWith('.controller.ts'));
  /** @type {Array<Record<string, unknown>>} */
  const allRoutes = [];
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const moduleMap = new Map();

  for (const file of controllers.sort()) {
    const src = fs.readFileSync(file, 'utf8');
    const base = extractControllerBase(src);
    const tag = extractApiTags(src);
    const rel = path.relative(MODULES_DIR, file);
    const module = rel.split(path.sep)[0];
    const routes = extractRoutes(src, base).map((r) => ({
      ...r,
      module,
      controllerFile: path.relative(ROOT, file).replace(/\\/g, '/'),
      swaggerTag: tag,
    }));
    allRoutes.push(...routes);
    if (!moduleMap.has(module)) moduleMap.set(module, []);
    moduleMap.get(module).push(...routes);
  }

  const catalogSrc = fs.readFileSync(
    path.join(MODULES_DIR, 'rbac/permissions.catalog.ts'),
    'utf8',
  );
  const permissionsCatalog = [
    ...new Set(
      [...catalogSrc.matchAll(/'([a-z0-9_.]+)'/g)]
        .map((m) => m[1])
        .filter((p) => p.includes('.')),
    ),
  ];

  /** @type {Set<string>} */
  const usedPerms = new Set();
  for (const r of allRoutes) {
    for (const p of /** @type {string[]} */ (r.permissions)) usedPerms.add(p);
  }

  /** @type {Array<Record<string, unknown>>} */
  const statusEnums = [];
  for (const file of walk(
    BACKEND_SRC,
    (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts'),
  )) {
    const src = fs.readFileSync(file, 'utf8');
    const enumRe = /export enum (\w*Status\w*)\s*\{([^}]+)\}/g;
    let m;
    while ((m = enumRe.exec(src)) !== null) {
      const name = m[1];
      const values = [...m[2].matchAll(/(\w+)\s*=\s*'([^']+)'/g)].map((x) => ({
        key: x[1],
        value: x[2],
      }));
      if (values.length === 0) continue;
      statusEnums.push({
        name,
        values: values.map((v) => v.value),
        members: values,
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        module: file.includes(`${path.sep}modules${path.sep}`)
          ? path.relative(MODULES_DIR, file).split(path.sep)[0]
          : 'shared',
      });
    }
  }

  const modules = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  /** @param {string} module */
  function resolveApiDoc(module) {
    const mapped = MODULE_API_DOC[module];
    if (mapped && apiDocs.includes(mapped)) return mapped;
    const upper = module.replace(/-/g, '_').toUpperCase();
    const hit = apiDocs.find(
      (d) =>
        d === `${upper}_API.md` ||
        d.replace(/_API\.md$/, '').replace(/_/g, '-').toLowerCase() === module,
    );
    return hit || null;
  }

  const moduleSummaries = modules.map((mod) => {
    const routes = moduleMap.get(mod) || [];
    const perms = [...new Set(routes.flatMap((r) => r.permissions))];
    const methods = [...new Set(routes.map((r) => r.method))];
    const doc = resolveApiDoc(mod);
    const note =
      mod === 'numbering'
        ? 'Internal service (no HTTP controller); used by other modules'
        : mod === 'sessions'
          ? 'Internal session store (no dedicated HTTP controller); auth routes manage sessions'
          : null;
    return {
      module: mod,
      hasController: routes.length > 0,
      routeCount: routes.length,
      methods,
      permissions: perms,
      permissionNote:
        PUBLIC_MODULES.has(mod) || mod === 'auth'
          ? 'Public and/or authenticated routes; see route inventory for per-route RequirePermissions'
          : perms.length
            ? null
            : note,
      swaggerTags: [...new Set(routes.map((r) => r.swaggerTag).filter(Boolean))],
      apiDoc: doc,
      apiDocPresent: Boolean(doc),
      responseShape:
        'ApiSuccessResponse { success: true, message: string, data: T, meta?: object }',
      controllerFiles: [...new Set(routes.map((r) => r.controllerFile))],
      note,
    };
  });

  const routeKey = (/** @type {{ method: string; path: string }} */ r) =>
    `${r.method} ${r.path}`;
  /** @type {Map<string, string>} */
  const seen = new Map();
  /** @type {Array<Record<string, string>>} */
  const duplicates = [];
  for (const r of allRoutes) {
    const k = routeKey(/** @type {{ method: string; path: string }} */ (r));
    if (seen.has(k)) {
      duplicates.push({
        route: k,
        a: seen.get(k) ?? '',
        b: String(r.controllerFile),
      });
    } else {
      seen.set(k, String(r.controllerFile));
    }
  }

  const routesMissingPermissions = allRoutes.filter((r) => {
    const key = routeKey(/** @type {{ method: string; path: string }} */ (r));
    if (r.skipPermissions) return false;
    if (/** @type {string[]} */ (r.permissions).length > 0) return false;
    if (PUBLIC_MODULES.has(String(r.module))) return false;
    if (AUTH_PUBLIC_PATHS.has(key)) return false;
    // Auth authenticated routes without explicit decorator still use JWT globally
    if (r.module === 'auth') return false;
    return true;
  });

  const isProdSource = (/** @type {string} */ p) =>
    /\.(ts|tsx)$/.test(p) &&
    !p.includes(`${path.sep}__tests__${path.sep}`) &&
    !/\.(spec|test)\.(ts|tsx)$/.test(p);

  const webSrc = walk(path.join(ROOT, 'apps/web/src'), isProdSource);
  const mobileSrc = walk(path.join(ROOT, 'apps/mobile/src'), isProdSource);
  const webCalls = extractClientCalls(webSrc);
  const mobileCalls = extractClientCalls(mobileSrc);

  const webRoutesSrc = fs.readFileSync(
    path.join(ROOT, 'apps/web/src/routes/index.tsx'),
    'utf8',
  );
  const webPaths = [
    ...webRoutesSrc.matchAll(/path=["']([^"']+)["']/g),
  ].map((m) => m[1]);

  const mobileNav = fs.readFileSync(
    path.join(ROOT, 'apps/mobile/src/navigation/RootNavigator.tsx'),
    'utf8',
  );
  const mobileScreenNames = [
    ...mobileNav.matchAll(/name=["'](\w+)["']/g),
  ].map((m) => m[1]);

  return {
    generatedAt: new Date().toISOString(),
    phase: '001',
    globalPrefix: 'api/v1',
    swaggerUi: '/api/docs (when swaggerEnabled)',
    successEnvelope:
      '{ success: true, message: string, data: T, meta?: Record<string, unknown> }',
    errorEnvelope:
      '{ success: false, message: string, error?: { code, details }, meta?: object }',
    totals: {
      modules: modules.length,
      controllers: controllers.length,
      routes: allRoutes.length,
      permissionsCatalog: permissionsCatalog.length,
      permissionsUsedOnRoutes: usedPerms.size,
      statusEnums: statusEnums.length,
      apiDocFiles: apiDocs.length,
    },
    modules: moduleSummaries,
    routes: allRoutes,
    permissionsCatalog,
    permissionsUsedOnRoutes: [...usedPerms].sort(),
    permissionsInCatalogUnused: permissionsCatalog.filter(
      (p) => !usedPerms.has(p),
    ),
    permissionsUsedButNotInCatalog: [...usedPerms].filter(
      (p) => !permissionsCatalog.includes(p),
    ),
    statusEnums,
    gaps: {
      modulesWithoutControllers: modules.filter((m) => !moduleMap.has(m)),
      modulesMissingApiDoc: moduleSummaries
        .filter((m) => m.hasController && !m.apiDocPresent)
        .map((m) => m.module),
      duplicateRoutes: duplicates,
      routesMissingPermissions: routesMissingPermissions.map(
        (r) => `${r.method} ${r.path} (${r.controllerFile})`,
      ),
      routesMissingApiOperation: allRoutes
        .filter((r) => !r.hasApiOperation)
        .map((r) => `${r.method} ${r.path}`),
      sharedTypesPlaceholder: true,
      sharedValidationPlaceholder: true,
      frontendCoverage:
        'Web/mobile consume a small subset of backend APIs; most modules have no client yet',
    },
    frontend: {
      web: {
        pages: walk(path.join(ROOT, 'apps/web/src/pages'), (p) =>
          p.endsWith('.tsx'),
        ).map((p) => path.relative(ROOT, p).replace(/\\/g, '/')),
        routePaths: webPaths,
        apiClientFiles: walk(path.join(ROOT, 'apps/web/src/api'), (p) =>
          /\.tsx?$/.test(p),
        ).map((p) => path.relative(ROOT, p).replace(/\\/g, '/')),
        apiCalls: webCalls,
      },
      mobile: {
        screens: walk(path.join(ROOT, 'apps/mobile/src/screens'), (p) =>
          p.endsWith('.tsx'),
        ).map((p) => path.relative(ROOT, p).replace(/\\/g, '/')),
        navigatorScreenNames: mobileScreenNames,
        apiClientFiles: walk(path.join(ROOT, 'apps/mobile/src/api'), (p) =>
          /\.tsx?$/.test(p),
        ).map((p) => path.relative(ROOT, p).replace(/\\/g, '/')),
        apiCalls: mobileCalls,
      },
    },
  };
}

/**
 * @param {ReturnType<typeof buildInventory>} inventory
 */
function writePermissionInventory(inventory) {
  const lines = [
    '# Permission inventory',
    '',
    `Generated: ${inventory.generatedAt}`,
    '',
    'Source of truth: `apps/backend/src/modules/rbac/permissions.catalog.ts`.',
    '',
    `Catalog size: **${inventory.permissionsCatalog.length}**. Used on routes: **${inventory.permissionsUsedOnRoutes.length}**.`,
    '',
    '## Catalog',
    '',
    '| Permission | Used on a controller route |',
    '|---|---|',
  ];
  const used = new Set(inventory.permissionsUsedOnRoutes);
  for (const p of inventory.permissionsCatalog) {
    lines.push(`| \`${p}\` | ${used.has(p) ? 'yes' : '**no**'} |`);
  }
  lines.push(
    '',
    '## Unused catalog permissions (present but not on any `@RequirePermissions`)',
    '',
  );
  if (inventory.permissionsInCatalogUnused.length === 0) {
    lines.push('_None._');
  } else {
    for (const p of inventory.permissionsInCatalogUnused) {
      lines.push(`- \`${p}\``);
    }
  }
  lines.push(
    '',
    '## Permissions used on routes but missing from catalog',
    '',
  );
  if (inventory.permissionsUsedButNotInCatalog.length === 0) {
    lines.push('_None._');
  } else {
    for (const p of inventory.permissionsUsedButNotInCatalog) {
      lines.push(`- \`${p}\``);
    }
  }
  lines.push('');
  fs.writeFileSync(
    path.join(OUT_DIR, 'permission-inventory.md'),
    lines.join('\n'),
  );
}

/**
 * @param {ReturnType<typeof buildInventory>} inventory
 */
function writeStatusInventory(inventory) {
  const lines = [
    '# Status enum inventory',
    '',
    `Generated: ${inventory.generatedAt}`,
    '',
    `Total status enums found: **${inventory.statusEnums.length}**.`,
    '',
    'Values are extracted from `export enum *Status*` in backend source. UI must not invent statuses.',
    '',
    '| Enum | Module | Values | Source |',
    '|---|---|---|---|',
  ];
  for (const e of inventory.statusEnums.sort((a, b) =>
    String(a.name).localeCompare(String(b.name)),
  )) {
    lines.push(
      `| \`${e.name}\` | \`${e.module}\` | ${/** @type {string[]} */ (e.values).map((v) => `\`${v}\``).join(', ')} | \`${e.file}\` |`,
    );
  }
  lines.push('');
  fs.writeFileSync(
    path.join(OUT_DIR, 'status-enum-inventory.md'),
    lines.join('\n'),
  );
}

/**
 * @param {ReturnType<typeof buildInventory>} inventory
 */
function writeMatrix(inventory) {
  const lines = [
    '# UI / API matrix — Luxaria Developers ERP',
    '',
    `**Micro Phase 001** — verified contract map.`,
    '',
    `Generated: \`${inventory.generatedAt}\` via \`node scripts/audit-api-contracts.mjs\`.`,
    '',
    '## How to use this document',
    '',
    '- Later UI phases must consume **exact** paths, permissions and status values listed here (or in the linked inventories).',
    '- Do **not** invent endpoint paths, DTO fields, permissions or statuses.',
    '- Authoritative HTTP surface: Nest controllers under `apps/backend/src/modules/**/**.controller.ts` + Swagger UI at `/api/docs` (when enabled).',
    '- Machine-readable full route list: [`docs/inventories/route-inventory.json`](./inventories/route-inventory.json).',
    '- Permissions: [`docs/inventories/permission-inventory.md`](./inventories/permission-inventory.md).',
    '- Status enums: [`docs/inventories/status-enum-inventory.md`](./inventories/status-enum-inventory.md).',
    '- Full audit dump: [`docs/inventories/api-audit.json`](./inventories/api-audit.json).',
    '',
    '## Global contracts',
    '',
    '| Item | Value |',
    '|---|---|',
    `| API prefix | \`/${inventory.globalPrefix}\` |`,
    `| Swagger UI | \`${inventory.swaggerUi}\` |`,
    `| Success envelope | \`${inventory.successEnvelope}\` |`,
    `| Error envelope | \`${inventory.errorEnvelope}\` |`,
    '| Auth | JWT Bearer (`Authorization`) + refresh rotation |',
    '| Project scope header | `X-Project-Id` (clients already send when selected) |',
    '| Idempotency | `Idempotency-Key` header (where backend supports it) |',
    '',
    '## Totals',
    '',
    '| Metric | Count |',
    '|---|---|',
    `| Backend modules | ${inventory.totals.modules} |`,
    `| Controllers | ${inventory.totals.controllers} |`,
    `| HTTP routes | ${inventory.totals.routes} |`,
    `| Permission catalog | ${inventory.totals.permissionsCatalog} |`,
    `| Permissions used on routes | ${inventory.totals.permissionsUsedOnRoutes} |`,
    `| Status enums | ${inventory.totals.statusEnums} |`,
    `| Backend API markdown docs | ${inventory.totals.apiDocFiles} |`,
    '',
    '## Backend module coverage',
    '',
    'Every backend module must appear below with route/method/permission/response-shape entries (or an explicit internal-only note).',
    '',
    '| Module | Routes | Methods | Permissions (sample / note) | Response shape | API doc | Controllers |',
    '|---|---:|---|---|---|---|---|',
  ];

  for (const m of inventory.modules) {
    const permCell = m.hasController
      ? m.permissions.length
        ? m.permissions
            .slice(0, 6)
            .map((p) => `\`${p}\``)
            .join(', ') +
          (m.permissions.length > 6 ? `, … (+${m.permissions.length - 6})` : '')
        : m.permissionNote || '_none / public_'
      : m.note || '_no HTTP controller_';
    const methods = m.methods.length ? m.methods.join(', ') : '—';
    const doc = m.apiDocPresent
      ? `[\`${m.apiDoc}\`](../apps/backend/docs/${m.apiDoc})`
      : m.hasController
        ? '**missing**'
        : 'n/a';
    const controllers = m.controllerFiles.length
      ? m.controllerFiles.map((f) => `\`${f}\``).join('<br>')
      : '—';
    lines.push(
      `| \`${m.module}\` | ${m.routeCount} | ${methods} | ${permCell} | \`${m.responseShape}\` | ${doc} | ${controllers} |`,
    );
  }

  lines.push(
    '',
    '## Frontend capability map (current)',
    '',
    '### Web portal (`apps/web`)',
    '',
    '| Area | Status | Notes |',
    '|---|---|---|',
    '| Shell / auth / layout | Present | Login, JWT refresh, permission guard, project selector |',
    '| Routes | Partial | `/login`, `/`, `/users`, `/projects`, `/daily-progress-reports`, `/settings`, `/forbidden` |',
    '| Users page | Placeholder | Guarded by `user.view`; **does not call** `/users` API yet |',
    '| Projects page | Shell | Lists via project context `/projects` |',
    '| DPR page | Partial | `GET /daily-progress-reports` |',
    '| Dashboard / Settings | Shell | Minimal UI |',
    '| Domain modules (finance, procurement, sales, …) | Missing | No pages/clients yet |',
    '| Investor portal UI | Missing | Backend `investor-portal` exists |',
    '',
    '**Web API calls found:**',
    '',
    '| Method | Path | File |',
    '|---|---|---|',
  );

  for (const c of inventory.frontend.web.apiCalls.sort((a, b) =>
    a.path.localeCompare(b.path),
  )) {
    lines.push(`| ${c.method} | \`${c.path}\` | \`${c.file}\` |`);
  }

  lines.push(
    '',
    '### Mobile site app (`apps/mobile`)',
    '',
    '| Area | Status | Notes |',
    '|---|---|---|',
    '| Auth / project select / offline shell | Present | JWT, project context, sync queue |',
    '| Screens | Partial | Login, Home, Projects, Profile, PendingSync, GRN, DPR |',
    '| GRN offline enqueue | Partial | Posts to `/goods-receipts` via sync transport |',
    '| DPR offline enqueue | Partial | Posts to `/daily-progress-reports` |',
    '| Purchase orders | Partial | `GET /purchase-orders` helpers |',
    '| Broader site workflows | Missing | Stock issue, attendance, petty cash UI, etc. |',
    '',
    '**Mobile API / offline endpoints found:**',
    '',
    '| Method | Path | File |',
    '|---|---|---|',
  );

  for (const c of inventory.frontend.mobile.apiCalls.sort((a, b) =>
    a.path.localeCompare(b.path),
  )) {
    lines.push(`| ${c.method} | \`${c.path}\` | \`${c.file}\` |`);
  }

  lines.push(
    '',
    '### Shared packages',
    '',
    '| Package | Status | Gap |',
    '|---|---|---|',
    '| `@luxaria/shared-types` | **Phase 002** — common API envelopes | `ApiResponse`, `ApiError`, `PaginatedResponse`, `SelectOption`, `AuditMeta`. Domain DTOs still local. |',
    '| `@luxaria/shared-validation` | Placeholder | Only `healthStatusSchema` |',
    '',
    '## Gaps and flags',
    '',
    '### Modules without HTTP controllers (internal)',
    '',
  );
  for (const m of inventory.gaps.modulesWithoutControllers) {
    lines.push(`- \`${m}\``);
  }

  lines.push('', '### Controllers missing dedicated `apps/backend/docs/*_API.md`', '');
  if (inventory.gaps.modulesMissingApiDoc.length === 0) {
    lines.push('_None._');
  } else {
    for (const m of inventory.gaps.modulesMissingApiDoc) {
      lines.push(`- \`${m}\``);
    }
  }

  lines.push(
    '',
    '### Duplicate routes',
    '',
    inventory.gaps.duplicateRoutes.length === 0
      ? '_None detected._'
      : inventory.gaps.duplicateRoutes
          .map((d) => `- \`${d.route}\` — ${d.a} vs ${d.b}`)
          .join('\n'),
    '',
    '### Routes missing `@RequirePermissions` (excluding known public/auth)',
    '',
    inventory.gaps.routesMissingPermissions.length === 0
      ? '_None detected._'
      : inventory.gaps.routesMissingPermissions.map((r) => `- ${r}`).join('\n'),
    '',
    '### Routes missing `@ApiOperation` summary',
    '',
    inventory.gaps.routesMissingApiOperation.length === 0
      ? '_None detected._'
      : inventory.gaps.routesMissingApiOperation
          .slice(0, 40)
          .map((r) => `- ${r}`)
          .join('\n') +
        (inventory.gaps.routesMissingApiOperation.length > 40
          ? `\n- … +${inventory.gaps.routesMissingApiOperation.length - 40} more`
          : ''),
    '',
    '### Catalog permissions unused on any route',
    '',
  );
  for (const p of inventory.permissionsInCatalogUnused) {
    lines.push(`- \`${p}\``);
  }

  lines.push(
    '',
    '### Client / contract mismatches',
    '',
    '- Web `UsersPage` is a placeholder and does not call `GET /users` despite route guard `user.view`.',
    '- Common response envelopes are shared (`@luxaria/shared-types`); domain DTOs are still local to web/mobile.',
    '- Most backend modules have **no** web/mobile query/mutation client yet (expected before UI phases).',
    '- OpenAPI examples: Swagger is generated from Nest decorators; many DTOs lack explicit `@ApiProperty` examples (flag for later docs polish — not blocking route inventory).',
    '',
    '## Security notes for UI phases',
    '',
    '- Enforce role permission **and** project access **and** workflow/approval status.',
    '- Hiding a button is not sufficient; keep route/action guards and handle backend `403`.',
    '- Never edit posted journals, stock ledgers, approved vouchers or approved versions in the UI.',
    '- Prefer backend-authoritative financial totals.',
    '',
    '## Regeneration',
    '',
    '```bash',
    'node scripts/audit-api-contracts.mjs',
    'pnpm --filter @luxaria/backend test -- ui-api-matrix.coverage.spec',
    '```',
    '',
    '## Confirmation',
    '',
    'This document is the Phase 001 deliverable only. No later micro-phase UI was implemented while producing it.',
    '',
  );

  fs.writeFileSync(path.join(ROOT, 'docs/ui-api-matrix.md'), lines.join('\n'));
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const inventory = buildInventory();

  fs.writeFileSync(
    path.join(OUT_DIR, 'api-audit.json'),
    JSON.stringify(inventory, null, 2) + '\n',
  );

  const routeInventory = {
    generatedAt: inventory.generatedAt,
    globalPrefix: inventory.globalPrefix,
    routeCount: inventory.routes.length,
    routes: inventory.routes.map((r) => ({
      module: r.module,
      method: r.method,
      path: r.path,
      handler: r.handler,
      permissions: r.permissions,
      skipPermissions: r.skipPermissions,
      summary: r.summary,
      responseShape: r.responseShape,
      swaggerTag: r.swaggerTag,
      controllerFile: r.controllerFile,
    })),
  };
  fs.writeFileSync(
    path.join(OUT_DIR, 'route-inventory.json'),
    JSON.stringify(routeInventory, null, 2) + '\n',
  );

  writePermissionInventory(inventory);
  writeStatusInventory(inventory);
  writeMatrix(inventory);

  console.log('Audit complete:');
  console.log(JSON.stringify(inventory.totals, null, 2));
  console.log(`Wrote docs/ui-api-matrix.md and docs/inventories/*`);
}

main();
