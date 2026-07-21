import { describe, expect, it } from 'vitest';
import type { UserAccess } from '@/api/types';
import {
  canAssignRolesFromRbac,
  canCreateRole,
  canEditRole,
  canOpenRoles,
  canViewPermissionCatalog,
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

describe('RBAC administration role access', () => {
  it('uses exact role and permission catalog grants', () => {
    expect(canOpenRoles(access(['role.view']))).toBe(true);
    expect(canCreateRole(access(['role.create']))).toBe(true);
    expect(canAssignRolesFromRbac(access(['role.assign']))).toBe(true);
    expect(canViewPermissionCatalog(access(['permission.view']))).toBe(true);
  });

  it('requires role.view and role.update for the edit route', () => {
    expect(canEditRole(access(['role.update']))).toBe(false);
    expect(canEditRole(access(['role.view']))).toBe(false);
    expect(canEditRole(access(['role.view', 'role.update']))).toBe(true);
  });

  it('denies by default and honors effective bypass', () => {
    expect(canOpenRoles(undefined)).toBe(false);
    expect(canAssignRolesFromRbac(access([]))).toBe(false);
    expect(canEditRole(access([], true))).toBe(true);
  });
});
