import type { UserAccess } from '@/api/types';

export const INVESTOR_PORTAL_VIEW = 'investor_portal.view';

/** Permissions that grant access to the internal staff ERP shell (not investor portal). */
const STAFF_SHELL_PERMISSIONS = [
  'user.view',
  'project.view',
  'dpr.view',
  'dashboard.view',
  'company.view',
  'report.view',
  'investor.create',
  'investor.update',
] as const;

export function hasInvestorPortalAccess(access: UserAccess | null): boolean {
  if (!access) return false;
  if (access.bypassPermissions) return true;
  return access.permissions.includes(INVESTOR_PORTAL_VIEW);
}

/**
 * True when the signed-in user should use the isolated investor shell only
 * (INVESTOR role or investor_portal.view without staff ERP permissions).
 */
export function isInvestorOnlySession(access: UserAccess | null): boolean {
  if (!access || access.bypassPermissions) return false;
  if (!access.permissions.includes(INVESTOR_PORTAL_VIEW)) return false;

  if (access.roleCodes.includes('INVESTOR')) {
    return true;
  }

  const hasStaffShell = STAFF_SHELL_PERMISSIONS.some((permission) =>
    access.permissions.includes(permission),
  );
  return !hasStaffShell;
}

export function investorLoginPath(): string {
  return '/investor/login';
}

export function investorHomePath(): string {
  return '/investor/dashboard';
}
