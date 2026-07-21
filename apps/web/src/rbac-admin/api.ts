import { apiGet, apiPatch, apiPost } from '@/api/client';
import { normaliseAdminUser } from '@/user-admin/api';
import { readAdminPaginationMeta } from '@/user-admin/apiMeta';
import type { PublicUser } from '@/user-admin/types';
import type {
  CloneRoleInput,
  CreateRoleInput,
  EffectiveUserAccess,
  ListRolesQuery,
  PaginatedRoles,
  PermissionCatalogItem,
  PublicRole,
  UpdateRoleInput,
} from './types';

function toOptionalIso(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseRole(role: PublicRole): PublicRole {
  return {
    ...role,
    description: role.description ?? null,
    permissions: [...(role.permissions ?? [])].sort(),
    bypassPermissions: Boolean(role.bypassPermissions),
    isSystem: Boolean(role.isSystem),
    createdAt: toOptionalIso(role.createdAt),
    updatedAt: toOptionalIso(role.updatedAt),
  };
}

export async function fetchPermissionCatalog(): Promise<
  PermissionCatalogItem[]
> {
  const response = await apiGet<PermissionCatalogItem[]>('/rbac/permissions');
  return response.data ?? [];
}

export async function fetchEffectiveUserAccess(): Promise<EffectiveUserAccess> {
  const response = await apiGet<EffectiveUserAccess>('/rbac/me/permissions');
  if (!response.data) {
    throw new Error(response.message || 'Effective permissions unavailable');
  }
  return response.data;
}

export async function fetchRoles(
  query: ListRolesQuery = {},
): Promise<PaginatedRoles> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const response = await apiGet<PublicRole[]>('/rbac/roles', {
    ...query,
    page,
    limit,
  });
  return {
    items: (response.data ?? []).map(normaliseRole),
    meta: readAdminPaginationMeta(
      response.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

export async function fetchRole(roleId: string): Promise<PublicRole> {
  const response = await apiGet<PublicRole>(`/rbac/roles/${roleId}`);
  if (!response.data) {
    throw new Error(response.message || 'Role not found');
  }
  return normaliseRole(response.data);
}

export async function createRole(input: CreateRoleInput): Promise<PublicRole> {
  const response = await apiPost<PublicRole>('/rbac/roles', input);
  if (!response.data) {
    throw new Error(response.message || 'Role creation failed');
  }
  return normaliseRole(response.data);
}

export async function updateRole(
  roleId: string,
  input: UpdateRoleInput,
): Promise<PublicRole> {
  const response = await apiPatch<PublicRole>(
    `/rbac/roles/${roleId}`,
    input,
  );
  if (!response.data) {
    throw new Error(response.message || 'Role update failed');
  }
  return normaliseRole(response.data);
}

/** Full replacement; the server validates every code against its catalog. */
export async function replaceRolePermissions(
  roleId: string,
  permissions: string[],
): Promise<PublicRole> {
  const response = await apiPost<PublicRole>(
    `/rbac/roles/${roleId}/permissions`,
    { permissions },
  );
  if (!response.data) {
    throw new Error(response.message || 'Permission assignment failed');
  }
  return normaliseRole(response.data);
}

export async function cloneRole(
  roleId: string,
  input: CloneRoleInput,
): Promise<PublicRole> {
  const response = await apiPost<PublicRole>(
    `/rbac/roles/${roleId}/clone`,
    input,
  );
  if (!response.data) {
    throw new Error(response.message || 'Role clone failed');
  }
  return normaliseRole(response.data);
}

export async function activateRole(roleId: string): Promise<PublicRole> {
  const response = await apiPost<PublicRole>(
    `/rbac/roles/${roleId}/activate`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Role activation failed');
  }
  return normaliseRole(response.data);
}

export async function deactivateRole(roleId: string): Promise<PublicRole> {
  const response = await apiPost<PublicRole>(
    `/rbac/roles/${roleId}/deactivate`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Role deactivation failed');
  }
  return normaliseRole(response.data);
}

/**
 * Full replacement through RbacController. This is intentionally distinct
 * from the UsersController action because it requires `role.assign`.
 */
export async function replaceUserRolesFromRbac(
  userId: string,
  roleIds: string[],
): Promise<PublicUser> {
  const response = await apiPost<PublicUser>(`/rbac/users/${userId}/roles`, {
    roleIds,
  });
  if (!response.data) {
    throw new Error(response.message || 'User role assignment failed');
  }
  return normaliseAdminUser(response.data);
}
