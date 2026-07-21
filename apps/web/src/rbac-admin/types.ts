import type { AdminPaginationMeta } from '@/user-admin/types';

export const RoleStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type RoleStatus = (typeof RoleStatus)[keyof typeof RoleStatus];

export type PublicRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  bypassPermissions: boolean;
  isSystem: boolean;
  status: RoleStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type PermissionCatalogItem = {
  code: string;
  module: string;
  action: string;
};

export type EffectiveUserAccess = {
  userId: string;
  roleIds: string[];
  roleCodes: string[];
  permissions: string[];
  bypassPermissions: boolean;
};

export type PaginatedRoles = {
  items: PublicRole[];
  meta: AdminPaginationMeta;
};

export type ListRolesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: RoleStatus;
};

export type CreateRoleInput = {
  name: string;
  code?: string;
  description?: string | null;
  permissions?: string[];
  bypassPermissions?: boolean;
};

export type UpdateRoleInput = {
  name?: string;
  description?: string | null;
  bypassPermissions?: boolean;
};

export type CloneRoleInput = {
  name: string;
  code?: string;
  description?: string | null;
};
