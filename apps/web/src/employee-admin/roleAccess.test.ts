import { describe, expect, it } from 'vitest';
import type { UserAccess } from '@/api/types';
import {
  canCreateEmployee,
  canDeactivateEmployee,
  canManageSiteAccess,
  canManageSites,
  canOpenDepartments,
  canOpenDesignations,
  canOpenEmployees,
  canOpenSiteAccess,
  canProvisionSiteEngineer,
  canViewSites,
} from './roleAccess';

function access(permissions: string[], bypassPermissions = false): UserAccess {
  return {
    userId: 'user-1',
    roleIds: [],
    roleCodes: [],
    permissions,
    bypassPermissions,
  };
}

describe('employee administration role access', () => {
  it('uses the exact employee catalog permissions for each action', () => {
    expect(canOpenEmployees(access(['employee.view']))).toBe(true);
    expect(canCreateEmployee(access(['employee.create']))).toBe(true);
    expect(canDeactivateEmployee(access(['employee.deactivate']))).toBe(true);
    expect(canOpenDepartments(access(['department.view']))).toBe(true);
    expect(canOpenDesignations(access(['designation.view']))).toBe(true);
    expect(canOpenSiteAccess(access(['site_access.view']))).toBe(true);
    expect(canManageSiteAccess(access(['site_access.manage']))).toBe(true);
    expect(canViewSites(access(['site.view']))).toBe(true);
    expect(canManageSites(access(['site.manage']))).toBe(true);
  });

  it('requires the full provision permission set for Site Engineer', () => {
    expect(canProvisionSiteEngineer(access(['employee.create']))).toBe(false);
    expect(
      canProvisionSiteEngineer(
        access([
          'employee.create',
          'user.create',
          'project_access.assign',
          'site_access.assign',
        ]),
      ),
    ).toBe(true);
  });

  it('denies missing access and honors backend bypass semantics', () => {
    expect(canOpenEmployees(null)).toBe(false);
    expect(canCreateEmployee(access([]))).toBe(false);
    expect(canProvisionSiteEngineer(access([], true))).toBe(true);
  });
});
