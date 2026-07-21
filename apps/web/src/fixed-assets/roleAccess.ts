import type { PermissionCode } from '@/navigation/permissionCatalog';

export type FixedAssetCapabilities = {
  canView: boolean;
  canManage: boolean;
  canDepreciate: boolean;
};

export function resolveFixedAssetCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): FixedAssetCapabilities {
  return {
    canView: hasPermission('fixed_asset.view'),
    canManage: hasPermission('fixed_asset.manage'),
    canDepreciate: hasPermission('fixed_asset.depreciate'),
  };
}
