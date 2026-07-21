import type { PermissionCode } from '@/navigation/permissionCatalog';

export type CustomerWarrantyCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveCustomerWarrantyCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): CustomerWarrantyCapabilities {
  return {
    canView: hasPermission('warranty.view'),
    canManage: hasPermission('warranty.manage'),
  };
}
