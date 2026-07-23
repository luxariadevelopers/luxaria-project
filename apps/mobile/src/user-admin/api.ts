import { apiGet, apiPatch, apiPost } from '@/api/client';
import { API_BASE_URL } from '@/config/env';
import {
  ReportingApprovalMode,
  type CreateUserInput,
  type ListUsersQuery,
  type PaginatedUsers,
  type ProjectOption,
  type PublicUser,
  type RoleOption,
  type UpdateUserInput,
} from './types';

function toNullableIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readAdminPaginationMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
) {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

export function normaliseAdminUser(user: PublicUser): PublicUser {
  const officers =
    user.reportingOfficers?.length
      ? user.reportingOfficers
      : user.reportingManager
        ? [user.reportingManager]
        : [];
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
    reportingManager: user.reportingManager ?? officers[0] ?? null,
    reportingOfficers: officers,
    reportingApprovalMode:
      user.reportingApprovalMode === ReportingApprovalMode.All
        ? ReportingApprovalMode.All
        : ReportingApprovalMode.Any,
    mustChangePassword: Boolean(user.mustChangePassword),
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

/** `POST /users` — create account. */
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

/** Merge project access (`user.assign_project`). */
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

/** Deactivate selected project-access records. */
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

/** `GET /rbac/roles` — role catalog for assignment UI (`role.view`). */
export async function listRolesForAdmin(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<RoleOption[]> {
  const response = await apiGet<Array<Record<string, unknown>>>('/rbac/roles', {
    page: params?.page ?? 1,
    limit: params?.limit ?? 100,
    sortBy: 'name',
    sortOrder: 'asc',
    ...(params?.status ? { status: params.status } : {}),
  });
  return (response.data ?? []).map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? row.code ?? row.id),
    status: String(row.status ?? 'active'),
    bypassPermissions: Boolean(row.bypassPermissions),
  }));
}

/** `GET /projects` — project catalog for assignment UI (`project.view`). */
export async function listProjectsForAdmin(params?: {
  page?: number;
  limit?: number;
}): Promise<ProjectOption[]> {
  const response = await apiGet<Array<Record<string, unknown>>>('/projects', {
    page: params?.page ?? 1,
    limit: params?.limit ?? 100,
    sortBy: 'projectName',
    sortOrder: 'asc',
  });
  return (response.data ?? []).map((row) => ({
    id: String(row.id),
    projectCode: String(row.projectCode ?? ''),
    projectName: String(row.projectName ?? row.name ?? row.id),
  }));
}

export function resolveUserProfilePhotoUrl(
  profilePhoto: string | null | undefined,
): string | null {
  const value = profilePhoto?.trim();
  if (!value) return null;
  if (/^(?:https?:|data:|blob:|file:)/i.test(value)) {
    return value;
  }
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  if (value.startsWith('/')) {
    return `${base}${value}`;
  }
  return `${base}/uploads/${value}`;
}
