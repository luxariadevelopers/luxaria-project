import type { UserAccess } from '@/api/types';

export const RBAC_ADMIN_PERMISSIONS = {
  viewRole: 'role.view',
  createRole: 'role.create',
  updateRole: 'role.update',
  assignRole: 'role.assign',
  viewPermission: 'permission.view',
} as const;

export function hasRbacAdminPermission(
  access: UserAccess | null | undefined,
  permission: (typeof RBAC_ADMIN_PERMISSIONS)[keyof typeof RBAC_ADMIN_PERMISSIONS],
): boolean {
  if (!access) return false;
  return access.bypassPermissions || access.permissions.includes(permission);
}

export function canOpenRoles(access: UserAccess | null | undefined): boolean {
  return hasRbacAdminPermission(access, RBAC_ADMIN_PERMISSIONS.viewRole);
}

export function canCreateRole(access: UserAccess | null | undefined): boolean {
  return hasRbacAdminPermission(access, RBAC_ADMIN_PERMISSIONS.createRole);
}

export function canEditRole(access: UserAccess | null | undefined): boolean {
  return (
    hasRbacAdminPermission(access, RBAC_ADMIN_PERMISSIONS.viewRole) &&
    hasRbacAdminPermission(access, RBAC_ADMIN_PERMISSIONS.updateRole)
  );
}

export function canAssignRolesFromRbac(
  access: UserAccess | null | undefined,
): boolean {
  return hasRbacAdminPermission(access, RBAC_ADMIN_PERMISSIONS.assignRole);
}

export function canViewPermissionCatalog(
  access: UserAccess | null | undefined,
): boolean {
  return hasRbacAdminPermission(access, RBAC_ADMIN_PERMISSIONS.viewPermission);
}
