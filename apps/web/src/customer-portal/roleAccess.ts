import type { PermissionCode } from '@/navigation/permissionCatalog';

export type CustomerPortalCapabilities = {
  canView: boolean;
};

export function resolveCustomerPortalCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): CustomerPortalCapabilities {
  return {
    canView: hasPermission('customer_portal.view'),
  };
}
