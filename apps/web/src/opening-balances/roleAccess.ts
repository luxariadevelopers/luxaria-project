import type { PermissionCode } from '@/navigation/permissionCatalog';

export type OpeningBalanceCapabilities = {
  canView: boolean;
  canManage: boolean;
  canPost: boolean;
};

export function resolveOpeningBalanceCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): OpeningBalanceCapabilities {
  return {
    canView: hasPermission('opening_balance.view'),
    canManage: hasPermission('opening_balance.manage'),
    canPost: hasPermission('opening_balance.post'),
  };
}
