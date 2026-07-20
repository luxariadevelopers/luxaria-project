import type { PermissionCode } from '@/navigation/permissionCatalog';

export type CustomerCapabilities = {
  canView: boolean;
  /** Nest has no `customer.create` — create maps to `customer.manage`. */
  canCreate: boolean;
  /** Nest has no `customer.update` — update maps to `customer.manage`. */
  canUpdate: boolean;
  canVerifyKyc: boolean;
  canActivate: boolean;
  canUploadDocument: boolean;
  /**
   * Full Aadhaar decrypt / sensitive KYC download.
   * Prompt alias `customer.view_sensitive` → Nest `customer.manage`.
   */
  canViewSensitive: boolean;
  canViewBookings: boolean;
  canViewReceipts: boolean;
  canViewLedger: boolean;
};

/**
 * Nest RBAC codes:
 * - `customer.view` — list / get / documents metadata
 * - `customer.manage` — create, update, verify-kyc, activate/deactivate,
 *   upload docs, full Aadhaar, sensitive downloads
 * - Bookings / receipts / ledger tabs use their own Nest codes
 */
export function resolveCustomerCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): CustomerCapabilities {
  const manage = hasPermission('customer.manage');
  return {
    canView: hasPermission('customer.view'),
    canCreate: manage,
    canUpdate: manage,
    canVerifyKyc: manage,
    canActivate: manage,
    canUploadDocument: manage,
    canViewSensitive: manage,
    canViewBookings: hasPermission('booking.view'),
    canViewReceipts: hasPermission('collection.view'),
    canViewLedger: hasPermission('report.view'),
  };
}

export const CUSTOMER_DETAIL_TAB_IDS = [
  'overview',
  'joint',
  'documents',
  'kyc',
  'bookings',
  'receipts',
  'ledger',
] as const;

export type CustomerDetailTabId = (typeof CUSTOMER_DETAIL_TAB_IDS)[number];

export type CustomerDetailTabDef = {
  id: CustomerDetailTabId;
  label: string;
  /** When set, tab is hidden unless the user has this permission. */
  permission?: PermissionCode;
};

export const CUSTOMER_DETAIL_TAB_DEFS: readonly CustomerDetailTabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'joint', label: 'Joint applicant' },
  { id: 'documents', label: 'Documents' },
  { id: 'kyc', label: 'KYC' },
  { id: 'bookings', label: 'Bookings', permission: 'booking.view' },
  { id: 'receipts', label: 'Receipts', permission: 'collection.view' },
  { id: 'ledger', label: 'Ledger', permission: 'report.view' },
] as const;

export function filterCustomerDetailTabs(
  hasPermission: (code: PermissionCode | string) => boolean,
  defs: readonly CustomerDetailTabDef[] = CUSTOMER_DETAIL_TAB_DEFS,
): CustomerDetailTabDef[] {
  return defs.filter(
    (tab) => !tab.permission || hasPermission(tab.permission),
  );
}
