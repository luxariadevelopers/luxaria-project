/**
 * Compatibility re-exports — canonical definitions live in `routeRegistry.ts`.
 * This file must not be imported by `routeRegistry.ts` (avoids circular loads).
 */
export type { NavGroupId, NavPillarId } from './routeRegistry';
export {
  NAV_PILLARS,
  NAV_SECTIONS_BY_GROUP,
  NAV_SECTION_BY_ROUTE_ID,
  getNavSectionId,
} from './routeRegistry';
