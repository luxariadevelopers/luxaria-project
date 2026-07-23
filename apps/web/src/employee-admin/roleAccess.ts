import type { UserAccess } from '@/api/types';

export const EMPLOYEE_ADMIN_PERMISSIONS = {
  view: 'employee.view',
  create: 'employee.create',
  update: 'employee.update',
  deactivate: 'employee.deactivate',
  departmentView: 'department.view',
  departmentManage: 'department.manage',
  designationView: 'designation.view',
  designationManage: 'designation.manage',
  siteView: 'site.view',
  siteManage: 'site.manage',
  siteAccessView: 'site_access.view',
  siteAccessAssign: 'site_access.assign',
  siteAccessManage: 'site_access.manage',
  userCreate: 'user.create',
  userView: 'user.view',
  projectAccessAssign: 'project_access.assign',
  projectView: 'project.view',
} as const;

export function hasEmployeeAdminPermission(
  access: UserAccess | null | undefined,
  permission: (typeof EMPLOYEE_ADMIN_PERMISSIONS)[keyof typeof EMPLOYEE_ADMIN_PERMISSIONS],
): boolean {
  if (!access) return false;
  return access.bypassPermissions || access.permissions.includes(permission);
}

export function canOpenEmployees(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(access, EMPLOYEE_ADMIN_PERMISSIONS.view);
}

export function canCreateEmployee(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(access, EMPLOYEE_ADMIN_PERMISSIONS.create);
}

/** Full provision gate matching POST /employees/provision-site-engineer. */
export function canProvisionSiteEngineer(
  access: UserAccess | null | undefined,
): boolean {
  if (!access) return false;
  if (access.bypassPermissions) return true;
  return (
    hasEmployeeAdminPermission(access, EMPLOYEE_ADMIN_PERMISSIONS.create) &&
    hasEmployeeAdminPermission(access, EMPLOYEE_ADMIN_PERMISSIONS.userCreate) &&
    hasEmployeeAdminPermission(
      access,
      EMPLOYEE_ADMIN_PERMISSIONS.projectAccessAssign,
    ) &&
    hasEmployeeAdminPermission(
      access,
      EMPLOYEE_ADMIN_PERMISSIONS.siteAccessAssign,
    )
  );
}

export function canDeactivateEmployee(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.deactivate,
  );
}

export function canOpenDepartments(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.departmentView,
  );
}

export function canManageDepartments(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.departmentManage,
  );
}

export function canOpenDesignations(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.designationView,
  );
}

export function canManageDesignations(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.designationManage,
  );
}

export function canOpenSiteAccess(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.siteAccessView,
  );
}

export function canManageSiteAccess(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.siteAccessManage,
  );
}

/** Assign or revoke people on sites (`site_access.assign`). */
export function canAssignSiteAccess(
  access: UserAccess | null | undefined,
): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.siteAccessAssign,
  );
}

export function canViewSites(access: UserAccess | null | undefined): boolean {
  return hasEmployeeAdminPermission(access, EMPLOYEE_ADMIN_PERMISSIONS.siteView);
}

export function canManageSites(access: UserAccess | null | undefined): boolean {
  return hasEmployeeAdminPermission(
    access,
    EMPLOYEE_ADMIN_PERMISSIONS.siteManage,
  );
}
