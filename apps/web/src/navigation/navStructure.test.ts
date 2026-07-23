import { describe, expect, it } from 'vitest';
import {
  APP_ROUTE_REGISTRY,
  buildNavGroupsFromRegistry,
  buildNavPillarsFromRegistry,
} from './routeRegistry';
import {
  getNavSectionId,
  NAV_PILLARS,
  NAV_SECTION_BY_ROUTE_ID,
  NAV_SECTIONS_BY_GROUP,
} from './navStructure';

describe('navStructure', () => {
  it('assigns a known subcategory to every sidebar route', () => {
    const navRoutes = APP_ROUTE_REGISTRY.filter(
      (route) => route.showInNav && route.groupId,
    );

    for (const route of navRoutes) {
      const sectionId = getNavSectionId(route.id);
      expect(sectionId, `missing section for ${route.id}`).toBeTruthy();
      const allowed = new Set(
        NAV_SECTIONS_BY_GROUP[route.groupId!].map((section) => section.id),
      );
      expect(
        allowed.has(sectionId!),
        `${route.id} section "${sectionId}" not in group ${route.groupId}`,
      ).toBe(true);
    }
  });

  it('builds nested sections without dumping items into Other', () => {
    const groups = buildNavGroupsFromRegistry();
    for (const group of groups) {
      expect(group.sections.length).toBeGreaterThan(0);
      expect(
        group.sections.find((section) => section.id === '_other'),
        `unsectioned items in ${group.id}`,
      ).toBeUndefined();
      const nestedCount = group.sections.reduce(
        (sum, section) => sum + section.items.length,
        0,
      );
      expect(nestedCount).toBe(group.items.length);
    }
  });

  it('keeps section map keys aligned to real routes', () => {
    const routeIds = new Set(APP_ROUTE_REGISTRY.map((route) => route.id));
    for (const routeId of Object.keys(NAV_SECTION_BY_ROUTE_ID)) {
      expect(
        routeIds.has(routeId),
        `unknown route in section map: ${routeId}`,
      ).toBe(true);
    }
  });

  it('covers every nav group exactly once in pillars', () => {
    const covered = NAV_PILLARS.flatMap((pillar) => pillar.groupIds);
    const unique = new Set(covered);
    expect(unique.size).toBe(covered.length);

    const groupIds = buildNavGroupsFromRegistry().map((group) => group.id);
    for (const groupId of groupIds) {
      expect(unique.has(groupId), `group ${groupId} missing from pillars`).toBe(
        true,
      );
    }
  });

  it('exposes a short pillar list for the sidebar', () => {
    const pillars = buildNavPillarsFromRegistry();
    expect(pillars.length).toBeLessThanOrEqual(7);
    expect(pillars.map((pillar) => pillar.id)).toEqual([
      'overview',
      'analytics',
      'projects',
      'supply',
      'sales',
      'finance',
      'admin',
    ]);
  });
});
