import type { PermissionCode } from '@/navigation/permissionCatalog';

export type SaleAgreementCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveSaleAgreementCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): SaleAgreementCapabilities {
  return {
    canView: hasPermission('agreement.view'),
    canManage: hasPermission('agreement.manage'),
  };
}
