#!/usr/bin/env node
/**
 * R-003 static safety: every Nest controller handler must declare a route scope
 * (class or method) via @ProjectScoped / @GlobalScope / @InvestorScoped /
 * @SystemInternal / @WebhookRoute / @Public / @RequireProjectAccess.
 *
 * Also regenerates docs/audit/remediation/R-003-project-route-inventory.csv
 *
 * Exit 1 when any authenticated handler lacks classification, or a
 * project-scoped handler lacks a resolution strategy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.join(root, 'apps/backend/src/modules');
const inventoryPath = path.join(
  root,
  'docs/audit/remediation/R-003-project-route-inventory.csv',
);

const SCOPE_DECORATORS = [
  'ProjectScoped',
  'GlobalScope',
  'InvestorScoped',
  'SystemInternal',
  'WebhookRoute',
  'Public',
  'RequireProjectAccess',
];

const HTTP_METHODS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head', 'All'];

function findControllers(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findControllers(full));
    else if (entry.name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function moduleName(filePath) {
  return path.relative(modulesDir, filePath).split(path.sep)[0];
}

function hasAnyScope(text) {
  return SCOPE_DECORATORS.some((d) => text.includes(`@${d}`));
}

function classHasScope(source) {
  const classMatch = source.match(
    /([\s\S]*?)export class \w+Controller/,
  );
  if (!classMatch) return false;
  const preamble = classMatch[1].slice(-800);
  return hasAnyScope(preamble);
}

function skipBalanced(lines, startIdx) {
  let depth = 0;
  let started = false;
  let j = startIdx;
  for (; j < lines.length; j++) {
    const line = lines[j];
    for (const ch of line) {
      if (ch === '(' || ch === '{') {
        depth += 1;
        started = true;
      } else if (ch === ')' || ch === '}') {
        depth -= 1;
      }
    }
    if (started && depth <= 0) {
      return j + 1;
    }
  }
  return startIdx + 1;
}

function extractHandlers(source) {
  const handlers = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const methodMatch = lines[i].match(
      new RegExp(`^\\s*@(?:${HTTP_METHODS.join('|')})\\(`),
    );
    if (!methodMatch) continue;

    const httpMethod = lines[i].match(/@(\w+)\(/)?.[1]?.toUpperCase() ?? 'GET';
    const routeMatch = lines[i].match(
      /@(?:Get|Post|Put|Patch|Delete|Options|Head|All)\((['"`])([^'"`]*)\1\)/,
    );
    const routeArg = routeMatch?.[2] ?? '';

    let j = i;
    const decoratorBlock = [];
    // Include any immediately preceding decorator lines (@Public, @ProjectScoped, …)
    let k = i - 1;
    while (k >= 0 && (/^\s*@/.test(lines[k]) || /^\s*$/.test(lines[k]))) {
      if (/^\s*@/.test(lines[k])) {
        decoratorBlock.unshift(lines[k]);
      }
      k -= 1;
      // stop if we hit a blank gap after collecting at least one, or a non-decorator
      if (k >= 0 && !/^\s*@/.test(lines[k]) && !/^\s*$/.test(lines[k])) break;
    }

    // Walk forward through decorator cluster (incl. multi-line)
    while (j < lines.length) {
      if (/^\s*$/.test(lines[j])) {
        j += 1;
        continue;
      }
      if (/^\s*@/.test(lines[j])) {
        decoratorBlock.push(lines[j]);
        j = skipBalanced(lines, j);
        continue;
      }
      break;
    }

    const nameMatch = lines[j]?.match(/^\s*(?:async\s+)?(\w+)\s*\(/);
    if (!nameMatch) continue;

    handlers.push({
      httpMethod,
      route: routeArg || '',
      handler: nameMatch[1],
      decoratorBlock: [...new Set(decoratorBlock)].join('\n'),
      line: i + 1,
    });
  }
  return handlers;
}

function classifyHandler(decoratorBlock, classScoped) {
  for (const d of SCOPE_DECORATORS) {
    if (decoratorBlock.includes(`@${d}`)) {
      if (d === 'Public') return 'public';
      if (d === 'GlobalScope') return 'global';
      if (d === 'InvestorScoped') return 'investor';
      if (d === 'SystemInternal') return 'system';
      if (d === 'WebhookRoute') return 'webhook';
      if (d === 'ProjectScoped' || d === 'RequireProjectAccess') return 'project';
    }
  }
  if (classScoped) {
    // Infer from class-level — scanner only knows presence; inventory uses class default
    return 'class-inherited';
  }
  return 'unclassified';
}

function hasProjectResolution(decoratorBlock, classSource) {
  const blob = decoratorBlock + '\n' + classSource.slice(0, 2500);
  return (
    blob.includes('projectId') ||
    blob.includes('resource:') ||
    blob.includes('resourceType') ||
    blob.includes('x-project-id') ||
    blob.includes("key: 'id'") ||
    blob.includes('mode: \'filter\'') ||
    blob.includes('mode: "filter"') ||
    blob.includes('RequireProjectAccess')
  );
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const controllers = findControllers(modulesDir);
const rows = [];
const violations = [];

for (const file of controllers) {
  const source = fs.readFileSync(file, 'utf8');
  const mod = moduleName(file);
  const controller = path.basename(file, '.ts');
  const classScoped = classHasScope(source);
  const handlers = extractHandlers(source);

  if (handlers.length === 0 && /@Controller\(/.test(source)) {
    violations.push({ file, reason: 'no-handlers-parsed' });
  }

  for (const h of handlers) {
    let scope = classifyHandler(h.decoratorBlock, classScoped);
    if (scope === 'class-inherited') {
      if (source.includes('@GlobalScope()')) scope = 'global';
      else if (source.includes('@InvestorScoped')) scope = 'investor';
      else if (source.includes('@ProjectScoped') || source.includes('@RequireProjectAccess'))
        scope = 'project';
      else if (source.includes('@SystemInternal')) scope = 'system';
      else if (source.includes('@WebhookRoute')) scope = 'webhook';
      else scope = 'unclassified';
    }

    const isPublic = h.decoratorBlock.includes('@Public');
    if (isPublic) scope = 'public';

    if (scope === 'unclassified') {
      violations.push({
        file,
        handler: h.handler,
        line: h.line,
        reason: 'missing-scope-classification',
      });
    }

    if (scope === 'project' && !hasProjectResolution(h.decoratorBlock, source)) {
      violations.push({
        file,
        handler: h.handler,
        line: h.line,
        reason: 'project-scoped-missing-resolution',
      });
    }

    if (scope === 'investor' && !h.decoratorBlock.includes('InvestorScoped') && !source.includes('@InvestorScoped')) {
      // class-level investor is fine
    }

    const resolution =
      scope === 'project'
        ? source.includes('resource:')
          ? 'resource+header/query/body/params'
          : 'header/query/body/params'
        : scope === 'investor'
          ? 'investor-participation'
          : 'n/a';

    rows.push({
      method: h.httpMethod,
      route: h.route,
      controller,
      handler: h.handler,
      module: mod,
      scope,
      projectResolutionSource: resolution,
      resourceOwnershipLookup: source.includes('resource:') ? 'yes' : 'no',
      guardDecorator: scope,
      serviceLevelAssertion: ['purchase-orders', 'journal', 'documents', 'approvals', 'projects', 'finance-dashboard'].includes(mod)
        ? 'partial-or-yes'
        : 'guard-primary',
      investorRestriction: scope === 'investor' ? 'yes' : 'n/a',
      companyRestriction: 'project-assignment-boundary',
      testCoverage: scope === 'project' ? 'idor-matrix-partial' : 'scope-static',
      status: scope === 'unclassified' ? 'FAIL' : 'classified',
    });
  }
}

const header = [
  'method',
  'route',
  'controller',
  'handler',
  'module',
  'scope classification',
  'project resolution source',
  'resource ownership lookup',
  'guard/decorator',
  'service-level assertion',
  'investor restriction',
  'company restriction',
  'test coverage',
  'status',
];

const csvLines = [
  header.join(','),
  ...rows.map((r) =>
    [
      r.method,
      r.route,
      r.controller,
      r.handler,
      r.module,
      r.scope,
      r.projectResolutionSource,
      r.resourceOwnershipLookup,
      r.guardDecorator,
      r.serviceLevelAssertion,
      r.investorRestriction,
      r.companyRestriction,
      r.testCoverage,
      r.status,
    ]
      .map(csvEscape)
      .join(','),
  ),
];

fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
fs.writeFileSync(inventoryPath, csvLines.join('\n') + '\n');

const counts = rows.reduce((acc, r) => {
  acc[r.scope] = (acc[r.scope] ?? 0) + 1;
  return acc;
}, {});

console.log(
  JSON.stringify(
    {
      controllers: controllers.length,
      handlers: rows.length,
      counts,
      violations: violations.length,
      inventoryPath,
      sampleViolations: violations.slice(0, 20),
    },
    null,
    2,
  ),
);

if (violations.length > 0) {
  process.exit(1);
}
