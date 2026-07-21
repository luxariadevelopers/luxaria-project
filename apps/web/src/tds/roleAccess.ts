import type { PermissionCode } from '@/navigation/permissionCatalog';

export type TdsCapabilities = {
  canView: boolean;
  canManage: boolean;
  canFile: boolean;
};

export function resolveTdsCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): TdsCapabilities {
  return {
    canView: hasPermission('tds.view'),
    canManage: hasPermission('tds.manage'),
    canFile: hasPermission('tds.file'),
  };
}
