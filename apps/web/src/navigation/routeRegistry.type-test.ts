/**
 * Compile-time checks for Micro Phase 012.
 * Included by `tsconfig.app.json` so `pnpm typecheck` enforces them.
 */
import type { AppRouteDefinition } from './routeRegistry';
import type { PermissionCode } from './permissionCatalog';

const valid: AppRouteDefinition = {
  id: 'type-test-valid',
  path: '/type-test-valid',
  title: 'Type test',
  layout: 'app',
  showInNav: false,
  projectScope: 'none',
  anyOf: ['user.view', 'project.view'] satisfies readonly PermissionCode[],
};

const _invalidPermission: AppRouteDefinition = {
  id: 'type-test-invalid',
  path: '/type-test-invalid',
  title: 'Invalid',
  layout: 'app',
  showInNav: false,
  projectScope: 'none',
  // @ts-expect-error invalid permission keys must fail typecheck
  anyOf: ['not.a.real.permission'],
};

void valid;
void _invalidPermission;
