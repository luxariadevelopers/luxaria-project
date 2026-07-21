import { apiGet, apiPatch, apiPost } from '@/api/client';
import { readAdminPaginationMeta } from './apiMeta';
import type {
  CreateUserInput,
  ListUsersQuery,
  PaginatedUsers,
  PublicUser,
  UpdateUserInput,
} from './types';

function toNullableIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function normaliseAdminUser(user: PublicUser): PublicUser {
  return {
    ...user,
    email: user.email ?? null,
    mobile: user.mobile ?? null,
    employeeId: user.employeeId ?? null,
    designation: user.designation ?? null,
    department: user.department ?? null,
    profilePhoto: user.profilePhoto ?? null,
    assignedProjects: user.assignedProjects ?? [],
    roleIds: user.roleIds ?? [],
    reportingManager: user.reportingManager ?? null,
    joiningDate: toNullableIso(user.joiningDate),
    lastLoginAt: toNullableIso(user.lastLoginAt),
    createdAt: toNullableIso(user.createdAt) ?? undefined,
    updatedAt: toNullableIso(user.updatedAt) ?? undefined,
  };
}

/** `GET /users` — list/search/filter/paginate, guarded by `user.view`. */
export async function fetchUsers(
  query: ListUsersQuery = {},
): Promise<PaginatedUsers> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const response = await apiGet<PublicUser[]>('/users', {
    ...query,
    page,
    limit,
  });
  return {
    items: (response.data ?? []).map(normaliseAdminUser),
    meta: readAdminPaginationMeta(
      response.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /users/:id` — guarded by `user.view`. */
export async function fetchUser(userId: string): Promise<PublicUser> {
  const response = await apiGet<PublicUser>(`/users/${userId}`);
  if (!response.data) {
    throw new Error(response.message || 'User not found');
  }
  return normaliseAdminUser(response.data);
}

/** `POST /users` — there is deliberately no invite wrapper. */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const response = await apiPost<PublicUser>('/users', input);
  if (!response.data) {
    throw new Error(response.message || 'User creation failed');
  }
  return normaliseAdminUser(response.data);
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<PublicUser> {
  const response = await apiPatch<PublicUser>(`/users/${userId}`, input);
  if (!response.data) {
    throw new Error(response.message || 'User update failed');
  }
  return normaliseAdminUser(response.data);
}

export async function activateUser(userId: string): Promise<PublicUser> {
  const response = await apiPost<PublicUser>(`/users/${userId}/activate`);
  if (!response.data) {
    throw new Error(response.message || 'User activation failed');
  }
  return normaliseAdminUser(response.data);
}

export async function deactivateUser(userId: string): Promise<PublicUser> {
  const response = await apiPost<PublicUser>(`/users/${userId}/deactivate`);
  if (!response.data) {
    throw new Error(response.message || 'User deactivation failed');
  }
  return normaliseAdminUser(response.data);
}

export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  await apiPost<null>(`/users/${userId}/reset-password`, { newPassword });
}

/** Full replacement through the UsersController (`user.assign_role`). */
export async function replaceUserRoles(
  userId: string,
  roleIds: string[],
): Promise<PublicUser> {
  const response = await apiPost<PublicUser>(`/users/${userId}/roles`, {
    roleIds,
  });
  if (!response.data) {
    throw new Error(response.message || 'Role assignment failed');
  }
  return normaliseAdminUser(response.data);
}

/** Merge project access through the real UsersController action. */
export async function assignUserProjects(
  userId: string,
  projectIds: string[],
): Promise<PublicUser> {
  const response = await apiPost<PublicUser>(`/users/${userId}/projects`, {
    projectIds,
  });
  if (!response.data) {
    throw new Error(response.message || 'Project assignment failed');
  }
  return normaliseAdminUser(response.data);
}

/** Deactivate selected project-access records through the real action. */
export async function removeUserProjects(
  userId: string,
  projectIds: string[],
): Promise<PublicUser> {
  const response = await apiPost<PublicUser>(
    `/users/${userId}/projects/remove`,
    { projectIds },
  );
  if (!response.data) {
    throw new Error(response.message || 'Project removal failed');
  }
  return normaliseAdminUser(response.data);
}
