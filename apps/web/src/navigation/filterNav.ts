import { isNavItemVisible, type RouteAccessContext } from './routeAccess';
import {
  buildNavGroupsFromRegistry,
  buildNavPillarsFromRegistry,
  type NavGroupConfig,
  type NavPillarConfig,
} from './routeRegistry';

export type { RouteAccessContext } from './routeAccess';
export { evaluateRouteAccess, canEnterRoute, isNavItemVisible } from './routeAccess';

/** Filter groups/items by the same access rules as route guards. */
export function filterNavGroups(
  groups: readonly NavGroupConfig[],
  ctx: RouteAccessContext,
): NavGroupConfig[] {
  return groups
    .map((group) => {
      const items = group.items.filter((item) => isNavItemVisible(item, ctx));
      const sections = group.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => isNavItemVisible(item, ctx)),
        }))
        .filter((section) => section.items.length > 0);
      return {
        ...group,
        items,
        sections,
      };
    })
    .filter((group) => group.items.length > 0);
}

export function filterNavPillars(
  pillars: readonly NavPillarConfig[],
  ctx: RouteAccessContext,
): NavPillarConfig[] {
  return pillars
    .map((pillar) => {
      const groups = filterNavGroups(pillar.groups, ctx);
      return {
        ...pillar,
        groups,
        items: groups.flatMap((group) => group.items),
      };
    })
    .filter((pillar) => pillar.items.length > 0);
}

/** Visible sidebar groups for the current user (registry → filter). */
export function getVisibleNavGroups(ctx: RouteAccessContext): NavGroupConfig[] {
  return filterNavGroups(buildNavGroupsFromRegistry(), ctx);
}

/** Visible sidebar pillars (short top-level categories). */
export function getVisibleNavPillars(ctx: RouteAccessContext): NavPillarConfig[] {
  return filterNavPillars(buildNavPillarsFromRegistry(), ctx);
}
