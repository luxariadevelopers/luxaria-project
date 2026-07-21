import type { PermissionCode } from '@/navigation/permissionCatalog';

export type GstCapabilities = {
  canView: boolean;
  canManage: boolean;
  canFile: boolean;
};

export function resolveGstCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): GstCapabilities {
  return {
    canView: hasPermission('gst.view'),
    canManage: hasPermission('gst.manage'),
    canFile: hasPermission('gst.file'),
  };
}
