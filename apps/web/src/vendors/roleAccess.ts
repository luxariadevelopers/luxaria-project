import type { PermissionCode } from '@/navigation/permissionCatalog';

export type VendorCapabilities = {
  canView: boolean;
  /** Nest has no `vendor.create` — create/update/block map to `vendor.manage`. */
  canCreate: boolean;
  canUpdate: boolean;
  canBlock: boolean;
  canActivate: boolean;
  canVerify: boolean;
  canManage: boolean;
  canViewInvoices: boolean;
  canViewPayments: boolean;
  canViewLedger: boolean;
  canViewQuality: boolean;
};

/**
 * Nest RBAC codes:
 * - `vendor.view` — list / get / documents / projects / ledger API
 * - `vendor.manage` — create, update, verify, activate, block
 * - `vendor_invoice.view` — invoice tab
 * - `payment.view` — payments / payable / ledger UI
 * - `quality.view` — quality score (optional)
 */
export function resolveVendorCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): VendorCapabilities {
  const manage = hasPermission('vendor.manage');
  const canView = hasPermission('vendor.view');
  const canViewPayments = hasPermission('payment.view');
  return {
    canView,
    canCreate: manage,
    canUpdate: manage,
    canBlock: manage,
    canActivate: manage,
    canVerify: manage,
    canManage: manage,
    canViewInvoices: hasPermission('vendor_invoice.view'),
    canViewPayments,
    canViewLedger: canView && canViewPayments,
    canViewQuality: hasPermission('quality.view'),
  };
}

export const VENDOR_DETAIL_TAB_IDS = [
  'overview',
  'bank',
  'documents',
  'projects',
  'performance',
  'payable',
  'invoices',
  'payments',
  'ledger',
] as const;

export type VendorDetailTabId = (typeof VENDOR_DETAIL_TAB_IDS)[number];

export type VendorDetailTabDef = {
  id: VendorDetailTabId;
  label: string;
  /** When set, tab is hidden unless the user has this permission. */
  permission?: PermissionCode;
};

export const VENDOR_DETAIL_TAB_DEFS: readonly VendorDetailTabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bank', label: 'Bank' },
  { id: 'documents', label: 'Documents' },
  { id: 'projects', label: 'Projects' },
  { id: 'performance', label: 'Performance' },
  { id: 'payable', label: 'Payable summary', permission: 'payment.view' },
  { id: 'invoices', label: 'Invoices', permission: 'vendor_invoice.view' },
  { id: 'payments', label: 'Payments', permission: 'payment.view' },
  { id: 'ledger', label: 'Ledger', permission: 'payment.view' },
] as const;

export function filterVendorDetailTabs(
  hasPermission: (code: PermissionCode | string) => boolean,
  defs: readonly VendorDetailTabDef[] = VENDOR_DETAIL_TAB_DEFS,
): VendorDetailTabDef[] {
  return defs.filter(
    (tab) => !tab.permission || hasPermission(tab.permission),
  );
}
