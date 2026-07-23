import { describe, expect, it } from 'vitest';
import {
  SITE_ENGINEER_ACCESS_MODULES,
  buildPermissionDeniesFromModules,
  defaultEnabledModules,
  enabledModulesFromDenyPermissions,
  moduleAccessCatalogPermissions,
} from './siteEngineerAccessModules';

describe('siteEngineerAccessModules', () => {
  it('defaults every module enabled with no denies', () => {
    const enabled = defaultEnabledModules();
    expect(Object.values(enabled).every(Boolean)).toBe(true);
    expect(buildPermissionDeniesFromModules(enabled)).toEqual([]);
  });

  it('denies dashboard + finance mobile tiles when dashboards module is off', () => {
    const enabled = defaultEnabledModules();
    enabled.dashboards = false;
    expect(buildPermissionDeniesFromModules(enabled)).toEqual([
      'dashboard.view',
    ]);
  });

  it('collects all codes when a multi-permission module is off', () => {
    const enabled = defaultEnabledModules();
    enabled.petty_cash = false;
    expect(buildPermissionDeniesFromModules(enabled)).toEqual([
      'cash.view',
      'petty_cash.request',
      'petty_cash.view',
    ]);
  });

  it('covers both web and mobile surfaces', () => {
    expect(SITE_ENGINEER_ACCESS_MODULES.some((m) => m.mobile)).toBe(true);
    expect(SITE_ENGINEER_ACCESS_MODULES.some((m) => m.web)).toBe(true);
  });

  it('round-trips deny list through enabledModules helpers', () => {
    const enabled = defaultEnabledModules();
    enabled.dashboards = false;
    enabled.dpr = false;
    const denies = buildPermissionDeniesFromModules(enabled);
    const restored = enabledModulesFromDenyPermissions(denies);
    expect(restored.dashboards).toBe(false);
    expect(restored.dpr).toBe(false);
    expect(restored.attendance).toBe(true);
    expect(moduleAccessCatalogPermissions()).toContain('dashboard.view');
  });
});
