import type { PermissionCode } from '@/navigation/permissionCatalog';

export type CustomerInvoiceCapabilities = {
  canView: boolean;
  canManage: boolean;
  canPost: boolean;
};

export function resolveCustomerInvoiceCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): CustomerInvoiceCapabilities {
  return {
    canView: hasPermission('customer_invoice.view'),
    canManage: hasPermission('customer_invoice.manage'),
    canPost: hasPermission('customer_invoice.post'),
  };
}
