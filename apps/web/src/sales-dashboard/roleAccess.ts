import type { PermissionCode } from '@/navigation/permissionCatalog';

export type SalesDashboardCapabilities = {
  canView: boolean;
};

export function resolveSalesDashboardCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): SalesDashboardCapabilities {
  return {
    canView: hasPermission('sales_report.view'),
  };
}
