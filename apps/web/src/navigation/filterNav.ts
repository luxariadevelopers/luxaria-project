import { isNavItemVisible, type RouteAccessContext } from './routeAccess';
import {
  buildNavGroupsFromRegistry,
  type NavGroupConfig,
} from './routeRegistry';

export type { RouteAccessContext } from './routeAccess';
export { evaluateRouteAccess, canEnterRoute, isNavItemVisible } from './routeAccess';

/** Filter groups/items by the same access rules as route guards. */
export function filterNavGroups(
  groups: readonly NavGroupConfig[],
  ctx: RouteAccessContext,
): NavGroupConfig[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavItemVisible(item, ctx)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Visible sidebar groups for the current user (registry → filter). */
export function getVisibleNavGroups(ctx: RouteAccessContext): NavGroupConfig[] {
  return filterNavGroups(buildNavGroupsFromRegistry(), ctx);
}
