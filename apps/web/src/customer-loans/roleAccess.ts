import type { PermissionCode } from '@/navigation/permissionCatalog';

export type CustomerLoanCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveCustomerLoanCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): CustomerLoanCapabilities {
  return {
    canView: hasPermission('loan.view'),
    canManage: hasPermission('loan.manage'),
  };
}
