/**
 * Compatibility re-exports — canonical source is `routeRegistry.ts`
 * (Micro Phase 012).
 */

export {
  APP_ROUTE_REGISTRY,
  NAV_GROUPS,
  NAV_GROUP_META,
  NAV_PILLARS_BUILT,
  ROUTE_LABELS,
  buildNavGroupsFromRegistry,
  buildNavPillarsFromRegistry,
  findRouteByPathname,
  getPageTitle,
  getRouteById,
  getRouteLabel,
  requireRouteById,
  toRelativeAppPath,
} from './routeRegistry';

export type {
  AppRouteDefinition,
  AppRouteId,
  NavGroupConfig,
  NavGroupId,
  NavIconId,
  NavItemConfig,
  NavPillarConfig,
  NavSectionConfig,
  ProjectScopeMode,
} from './routeRegistry';

export type { PermissionCode } from './permissionCatalog';
export {
  PERMISSIONS,
  SUPER_ADMIN_ROLE_CODE,
  isKnownPermission,
} from './permissionCatalog';
