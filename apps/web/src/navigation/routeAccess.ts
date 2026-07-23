import type { AppRouteDefinition, NavItemConfig } from './routeRegistry';

/**
 * Access evaluation shared by sidebar filtering and route guards.
 * User grants come from `GET /rbac/me/permissions` via AuthContext.
 */
export type RouteAccessContext = {
  /** False while `/rbac/me/permissions` has not resolved. */
  accessLoaded: boolean;
  bypassPermissions: boolean;
  permissions: readonly string[];
};

export type RouteAccessDecision = 'allow' | 'deny' | 'pending';

function hasAny(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((code) => granted.includes(code));
}

function hasAll(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((code) => granted.includes(code));
}

export function evaluateRouteAccess(
  route: Pick<AppRouteDefinition, 'anyOf' | 'allOf'>,
  ctx: RouteAccessContext,
): RouteAccessDecision {
  const needsAny = Boolean(route.anyOf?.length);
  const needsAll = Boolean(route.allOf?.length);

  if (!needsAny && !needsAll) {
    return 'allow';
  }

  if (!ctx.accessLoaded) {
    return 'pending';
  }

  if (ctx.bypassPermissions) {
    return 'allow';
  }

  if (needsAll && route.allOf && !hasAll(ctx.permissions, route.allOf)) {
    return 'deny';
  }
  if (needsAny && route.anyOf && !hasAny(ctx.permissions, route.anyOf)) {
    return 'deny';
  }

  return 'allow';
}

/** Sidebar: only show items explicitly allowed for the loaded permission set. */
export function isNavItemVisible(
  item: Pick<NavItemConfig, 'anyOf' | 'allOf'>,
  ctx: RouteAccessContext,
): boolean {
  return evaluateRouteAccess(item, ctx) === 'allow';
}

/**
 * Route guard: enter only when allow.
 * Pending waits in the guard (do not treat as allow — prevents URL flash).
 */
export function canEnterRoute(
  route: Pick<AppRouteDefinition, 'anyOf' | 'allOf'>,
  ctx: RouteAccessContext,
): boolean {
  return evaluateRouteAccess(route, ctx) === 'allow';
}
