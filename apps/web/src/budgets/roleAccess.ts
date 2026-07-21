import type { PermissionCode } from '@/navigation/permissionCatalog';

export type BudgetCapabilities = {
  canView: boolean;
  canManage: boolean;
  canApprove: boolean;
};

export function resolveBudgetCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): BudgetCapabilities {
  return {
    canView: hasPermission('budget.view'),
    canManage: hasPermission('budget.manage'),
    canApprove: hasPermission('budget.approve'),
  };
}
