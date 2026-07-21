import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateRole,
  cloneRole,
  createRole,
  deactivateRole,
  fetchEffectiveUserAccess,
  fetchPermissionCatalog,
  fetchRole,
  fetchRoles,
  replaceRolePermissions,
  replaceUserRolesFromRbac,
  updateRole,
} from './api';
import { RoleStatus, type PublicRole } from './types';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
}));

const role: PublicRole = {
  id: '507f1f77bcf86cd799439011',
  code: 'PROJECT_MANAGER',
  name: 'Project Manager',
  description: null,
  permissions: ['project.view'],
  bypassPermissions: false,
  isSystem: false,
  status: RoleStatus.Active,
};

describe('RBAC administration API', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
  });

  it('reads the real permission, effective-access, and role endpoints', async () => {
    apiGet
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          { code: 'project.view', module: 'project', action: 'view' },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: {
          userId: 'user-1',
          roleIds: [role.id],
          roleCodes: [role.code],
          permissions: ['project.view'],
          bypassPermissions: false,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [role],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: role,
      });

    await fetchPermissionCatalog();
    await fetchEffectiveUserAccess();
    await fetchRoles({ status: RoleStatus.Active });
    await fetchRole(role.id);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/rbac/permissions');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/rbac/me/permissions');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/rbac/roles', {
      status: RoleStatus.Active,
      page: 1,
      limit: 20,
    });
    expect(apiGet).toHaveBeenNthCalledWith(
      4,
      `/rbac/roles/${role.id}`,
    );
  });

  it('uses only supported role mutation endpoints', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: role,
    });
    apiPatch.mockResolvedValue({
      success: true,
      message: 'ok',
      data: role,
    });

    await createRole({ name: 'Project Manager' });
    await updateRole(role.id, { name: 'Project Lead' });
    await replaceRolePermissions(role.id, [
      'project.view',
      'project.update',
    ]);
    await cloneRole(role.id, { name: 'Project Manager Copy' });
    await activateRole(role.id);
    await deactivateRole(role.id);

    expect(apiPost).toHaveBeenNthCalledWith(1, '/rbac/roles', {
      name: 'Project Manager',
    });
    expect(apiPatch).toHaveBeenCalledWith(`/rbac/roles/${role.id}`, {
      name: 'Project Lead',
    });
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      `/rbac/roles/${role.id}/permissions`,
      { permissions: ['project.view', 'project.update'] },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      3,
      `/rbac/roles/${role.id}/clone`,
      { name: 'Project Manager Copy' },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      4,
      `/rbac/roles/${role.id}/activate`,
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      5,
      `/rbac/roles/${role.id}/deactivate`,
    );
  });

  it('full-replaces user roles through the role.assign endpoint', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'user-1',
        userCode: 'USR-1',
        fullName: 'User One',
        email: null,
        mobile: null,
        employeeId: null,
        designation: null,
        department: null,
        profilePhoto: null,
        status: 'active',
        assignedProjects: [],
        roleIds: [role.id],
        reportingManager: null,
        joiningDate: null,
        lastLoginAt: null,
      },
    });

    await replaceUserRolesFromRbac('user-1', [role.id]);

    expect(apiPost).toHaveBeenCalledWith('/rbac/users/user-1/roles', {
      roleIds: [role.id],
    });
  });
});
