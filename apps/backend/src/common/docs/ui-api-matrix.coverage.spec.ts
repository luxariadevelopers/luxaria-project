import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Micro Phase 001 — verify the checked-in UI/API matrix covers every backend module
 * with route, method, permission and response-shape entries (or an explicit internal note).
 */

type ModuleSummary = {
  module: string;
  hasController: boolean;
  routeCount: number;
  methods: string[];
  permissions: string[];
  permissionNote?: string | null;
  responseShape: string;
  note?: string | null;
};

type RouteEntry = {
  module: string;
  method: string;
  path: string;
  permissions: string[];
  skipPermissions?: boolean;
  responseShape: string;
};

type ApiAudit = {
  modules: ModuleSummary[];
  routes: RouteEntry[];
  gaps: {
    modulesWithoutControllers: string[];
  };
};

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (
      existsSync(join(dir, 'docs/ui-api-matrix.md')) &&
      existsSync(join(dir, 'apps/backend/src/modules'))
    ) {
      return dir;
    }
    dir = resolve(dir, '..');
  }
  throw new Error('Could not locate monorepo root from test path');
}

describe('UI/API matrix coverage (Micro Phase 001)', () => {
  const repoRoot = findRepoRoot(__dirname);
  const modulesDir = join(repoRoot, 'apps/backend/src/modules');
  const matrixPath = join(repoRoot, 'docs/ui-api-matrix.md');
  const auditPath = join(repoRoot, 'docs/inventories/api-audit.json');
  const routeInventoryPath = join(
    repoRoot,
    'docs/inventories/route-inventory.json',
  );
  const permissionInventoryPath = join(
    repoRoot,
    'docs/inventories/permission-inventory.md',
  );
  const statusInventoryPath = join(
    repoRoot,
    'docs/inventories/status-enum-inventory.md',
  );

  const backendModules = readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let audit: ApiAudit;

  beforeAll(() => {
    expect(existsSync(matrixPath)).toBe(true);
    expect(existsSync(auditPath)).toBe(true);
    expect(existsSync(routeInventoryPath)).toBe(true);
    expect(existsSync(permissionInventoryPath)).toBe(true);
    expect(existsSync(statusInventoryPath)).toBe(true);
    audit = JSON.parse(readFileSync(auditPath, 'utf8')) as ApiAudit;
  });

  it('lists every backend module in the audit inventory', () => {
    const audited = audit.modules.map((m) => m.module).sort();
    expect(audited).toEqual(backendModules);
  });

  it('gives every module route/method/permission/response-shape coverage or an internal note', () => {
    for (const mod of audit.modules) {
      expect(mod.responseShape.length).toBeGreaterThan(0);
      expect(mod.module).toBeTruthy();

      if (mod.hasController) {
        expect(mod.routeCount).toBeGreaterThan(0);
        expect(mod.methods.length).toBeGreaterThan(0);

        const moduleRoutes = audit.routes.filter((r) => r.module === mod.module);
        expect(moduleRoutes.length).toBe(mod.routeCount);

        for (const route of moduleRoutes) {
          expect(route.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE)$/);
          expect(route.path).toMatch(/^\/api\/v1/);
          expect(route.responseShape.length).toBeGreaterThan(0);
          expect(Array.isArray(route.permissions)).toBe(true);
        }

        const hasPermMetadata =
          mod.permissions.length > 0 ||
          Boolean(mod.permissionNote) ||
          moduleRoutes.every(
            (r) =>
              r.permissions.length > 0 ||
              Boolean(r.skipPermissions) ||
              mod.module === 'health' ||
              mod.module === 'version' ||
              mod.module === 'auth',
          );
        expect(hasPermMetadata).toBe(true);
      } else {
        expect(mod.note).toBeTruthy();
        expect(audit.gaps.modulesWithoutControllers).toContain(mod.module);
      }
    }
  });

  it('embeds every backend module name in docs/ui-api-matrix.md', () => {
    const matrix = readFileSync(matrixPath, 'utf8');
    for (const name of backendModules) {
      expect(matrix).toContain(`\`${name}\``);
    }
    expect(matrix).toContain('Backend module coverage');
    expect(matrix).toContain('Frontend capability map');
    expect(matrix).toContain('Gaps and flags');
  });

  it('keeps route inventory count aligned with audit routes', () => {
    const routeInventory = JSON.parse(
      readFileSync(routeInventoryPath, 'utf8'),
    ) as { routeCount: number; routes: unknown[] };
    expect(routeInventory.routeCount).toBe(audit.routes.length);
    expect(routeInventory.routes.length).toBe(audit.routes.length);
    expect(audit.routes.length).toBeGreaterThan(100);
  });
});
