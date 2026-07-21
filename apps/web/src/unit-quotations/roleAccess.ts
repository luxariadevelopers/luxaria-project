import type { PermissionCode } from '@/navigation/permissionCatalog';

export type UnitQuotationCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveUnitQuotationCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): UnitQuotationCapabilities {
  return {
    canView: hasPermission('quotation.view'),
    canManage: hasPermission('quotation.manage'),
  };
}
