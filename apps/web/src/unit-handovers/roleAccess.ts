import type { PermissionCode } from '@/navigation/permissionCatalog';

export type UnitHandoverCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveUnitHandoverCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): UnitHandoverCapabilities {
  return {
    canView: hasPermission('handover.view'),
    canManage: hasPermission('handover.manage'),
  };
}
