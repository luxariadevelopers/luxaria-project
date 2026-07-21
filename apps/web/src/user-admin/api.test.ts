import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateUser,
  assignUserProjects,
  createUser,
  deactivateUser,
  fetchUser,
  fetchUsers,
  removeUserProjects,
  replaceUserRoles,
  resetUserPassword,
  updateUser,
} from './api';
import { UserStatus, type PublicUser } from './types';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
}));

const user: PublicUser = {
  id: '507f1f77bcf86cd799439011',
  userCode: 'USR-000001',
  fullName: 'Admin User',
  email: 'admin@example.com',
  mobile: null,
  employeeId: null,
  designation: null,
  department: null,
  profilePhoto: null,
  status: UserStatus.Active,
  assignedProjects: [],
  roleIds: [],
  reportingManager: null,
  joiningDate: null,
  lastLoginAt: null,
};

describe('user administration API', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
  });

  it('lists, filters, paginates, and reads users through UsersController', async () => {
    apiGet
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [user],
        meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: user,
      });

    const result = await fetchUsers({
      page: 2,
      limit: 10,
      search: 'admin',
      status: UserStatus.Active,
      roleId: '507f1f77bcf86cd799439012',
      projectId: '507f1f77bcf86cd799439013',
    });
    await fetchUser(user.id);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/users', {
      page: 2,
      limit: 10,
      search: 'admin',
      status: UserStatus.Active,
      roleId: '507f1f77bcf86cd799439012',
      projectId: '507f1f77bcf86cd799439013',
    });
    expect(apiGet).toHaveBeenNthCalledWith(2, `/users/${user.id}`);
    expect(result.meta?.total).toBe(21);
  });

  it('creates and updates without inventing an invite endpoint', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'created',
      data: user,
    });
    apiPatch.mockResolvedValue({
      success: true,
      message: 'updated',
      data: user,
    });

    await createUser({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'Temporary123!',
    });
    await updateUser(user.id, { fullName: 'Updated Admin' });

    expect(apiPost).toHaveBeenCalledWith('/users', {
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'Temporary123!',
    });
    expect(apiPatch).toHaveBeenCalledWith(`/users/${user.id}`, {
      fullName: 'Updated Admin',
    });
    expect(
      [...apiPost.mock.calls, ...apiPatch.mock.calls].some(([url]) =>
        String(url).includes('invite'),
      ),
    ).toBe(false);
  });

  it('uses supported status, reset, role, and project actions', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: user,
    });

    await activateUser(user.id);
    await deactivateUser(user.id);
    await resetUserPassword(user.id, 'Temporary123!');
    await replaceUserRoles(user.id, ['507f1f77bcf86cd799439012']);
    await assignUserProjects(user.id, ['507f1f77bcf86cd799439013']);
    await removeUserProjects(user.id, ['507f1f77bcf86cd799439013']);

    expect(apiPost).toHaveBeenNthCalledWith(
      1,
      `/users/${user.id}/activate`,
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      `/users/${user.id}/deactivate`,
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      3,
      `/users/${user.id}/reset-password`,
      { newPassword: 'Temporary123!' },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      4,
      `/users/${user.id}/roles`,
      { roleIds: ['507f1f77bcf86cd799439012'] },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      5,
      `/users/${user.id}/projects`,
      { projectIds: ['507f1f77bcf86cd799439013'] },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      6,
      `/users/${user.id}/projects/remove`,
      { projectIds: ['507f1f77bcf86cd799439013'] },
    );
  });
});
