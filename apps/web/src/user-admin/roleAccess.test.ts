import { describe, expect, it } from 'vitest';
import type { UserAccess } from '@/api/types';
import {
  canActivateUser,
  canAssignUserProjects,
  canAssignUserRoles,
  canCreateUser,
  canDeactivateUser,
  canEditUser,
  canOpenUsers,
  canResetUserPassword,
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

describe('user administration role access', () => {
  it('uses the exact user catalog permissions for each action', () => {
    expect(canOpenUsers(access(['user.view']))).toBe(true);
    expect(canCreateUser(access(['user.create']))).toBe(true);
    expect(canActivateUser(access(['user.activate']))).toBe(true);
    expect(canDeactivateUser(access(['user.deactivate']))).toBe(true);
    expect(canResetUserPassword(access(['user.reset_password']))).toBe(true);
    expect(canAssignUserRoles(access(['user.assign_role']))).toBe(true);
    expect(canAssignUserProjects(access(['user.assign_project']))).toBe(true);
  });

  it('requires both view and update to open the edit route', () => {
    expect(canEditUser(access(['user.update']))).toBe(false);
    expect(canEditUser(access(['user.view']))).toBe(false);
    expect(canEditUser(access(['user.view', 'user.update']))).toBe(true);
  });

  it('denies missing access and honors backend bypass semantics', () => {
    expect(canOpenUsers(null)).toBe(false);
    expect(canCreateUser(access([]))).toBe(false);
    expect(canEditUser(access([], true))).toBe(true);
  });
});
