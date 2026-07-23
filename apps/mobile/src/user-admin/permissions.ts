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

export function resolveUserAdminCapabilities(
  hasPermission: (code: string) => boolean,
) {
  return {
    canView: hasPermission(USER_ADMIN_PERMISSIONS.view),
    canCreate: hasPermission(USER_ADMIN_PERMISSIONS.create),
    canUpdate: hasPermission(USER_ADMIN_PERMISSIONS.update),
    canActivate: hasPermission(USER_ADMIN_PERMISSIONS.activate),
    canDeactivate: hasPermission(USER_ADMIN_PERMISSIONS.deactivate),
    canResetPassword: hasPermission(USER_ADMIN_PERMISSIONS.resetPassword),
    canAssignRole: hasPermission(USER_ADMIN_PERMISSIONS.assignRole),
    canAssignProject: hasPermission(USER_ADMIN_PERMISSIONS.assignProject),
  };
}
