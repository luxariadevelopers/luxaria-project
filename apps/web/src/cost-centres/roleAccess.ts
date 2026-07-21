import type { PermissionCode } from '@/navigation/permissionCatalog';

export type CostCentreCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveCostCentreCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): CostCentreCapabilities {
  return {
    canView: hasPermission('cost_centre.view'),
    canManage: hasPermission('cost_centre.manage'),
  };
}
