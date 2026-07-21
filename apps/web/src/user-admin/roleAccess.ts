import type { UserAccess } from '@/api/types';

export const USER_ADMIN_PERMISSIONS = {
  view: 'user.view',
  create: 'user.create',
  update: 'user.update',
  activate: 'user.activate',
  deactivate: 'user.deactivate',
  resetPassword: 'user.reset_password',
  assignRole: 'user.assign_role',
  assignProject: 'user.assign_project',
} as const;

export function hasUserAdminPermission(
  access: UserAccess | null | undefined,
  permission: (typeof USER_ADMIN_PERMISSIONS)[keyof typeof USER_ADMIN_PERMISSIONS],
): boolean {
  if (!access) return false;
  return access.bypassPermissions || access.permissions.includes(permission);
}

export function canOpenUsers(access: UserAccess | null | undefined): boolean {
  return hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.view);
}

export function canCreateUser(access: UserAccess | null | undefined): boolean {
  return hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.create);
}

export function canEditUser(access: UserAccess | null | undefined): boolean {
  return (
    hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.view) &&
    hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.update)
  );
}

export function canActivateUser(access: UserAccess | null | undefined): boolean {
  return hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.activate);
}

export function canDeactivateUser(
  access: UserAccess | null | undefined,
): boolean {
  return hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.deactivate);
}

export function canResetUserPassword(
  access: UserAccess | null | undefined,
): boolean {
  return hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.resetPassword);
}

export function canAssignUserRoles(
  access: UserAccess | null | undefined,
): boolean {
  return hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.assignRole);
}

export function canAssignUserProjects(
  access: UserAccess | null | undefined,
): boolean {
  return hasUserAdminPermission(access, USER_ADMIN_PERMISSIONS.assignProject);
}
