import type { ListRolesQuery } from './types';

export const rbacAdminKeys = {
  all: ['rbac-admin'] as const,
  permissions: () => [...rbacAdminKeys.all, 'permissions'] as const,
  effectiveAccess: () =>
    [...rbacAdminKeys.all, 'effective-access'] as const,
  roles: () => [...rbacAdminKeys.all, 'roles'] as const,
  roleList: (query: ListRolesQuery) =>
    [...rbacAdminKeys.roles(), 'list', query] as const,
  roleDetails: () => [...rbacAdminKeys.roles(), 'detail'] as const,
  roleDetail: (roleId: string) =>
    [...rbacAdminKeys.roleDetails(), roleId] as const,
};
