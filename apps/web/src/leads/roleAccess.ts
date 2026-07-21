import type { PermissionCode } from '@/navigation/permissionCatalog';

export type LeadCapabilities = {
  canView: boolean;
  canManage: boolean;
  canConvert: boolean;
};

export function resolveLeadCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): LeadCapabilities {
  return {
    canView: hasPermission('lead.view'),
    canManage: hasPermission('lead.manage'),
    canConvert: hasPermission('lead.convert'),
  };
}
