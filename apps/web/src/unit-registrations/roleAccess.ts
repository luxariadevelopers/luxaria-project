import type { PermissionCode } from '@/navigation/permissionCatalog';

export type UnitRegistrationCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveUnitRegistrationCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): UnitRegistrationCapabilities {
  return {
    canView: hasPermission('registration.view'),
    canManage: hasPermission('registration.manage'),
  };
}
