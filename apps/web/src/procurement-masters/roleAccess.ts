/**
 * Nest RBAC for procurement masters:
 * - `procurement_master.view|manage` — purchase categories, payment/delivery/tax
 * - `material.view|manage` — material categories
 * - `vendor.view|manage` — vendor categories
 */

import type { MasterResource } from './types';

export type ProcurementMasterCapabilities = {
  canViewAny: boolean;
  canManageProcurement: boolean;
  canViewMaterialCategories: boolean;
  canManageMaterialCategories: boolean;
  canViewVendorCategories: boolean;
  canManageVendorCategories: boolean;
};

export function resolveProcurementMasterCapabilities(
  hasPermission: (code: string) => boolean,
): ProcurementMasterCapabilities {
  return {
    canViewAny:
      hasPermission('procurement_master.view') ||
      hasPermission('material.view') ||
      hasPermission('vendor.view'),
    canManageProcurement: hasPermission('procurement_master.manage'),
    canViewMaterialCategories: hasPermission('material.view'),
    canManageMaterialCategories: hasPermission('material.manage'),
    canViewVendorCategories: hasPermission('vendor.view'),
    canManageVendorCategories: hasPermission('vendor.manage'),
  };
}

export function canViewResource(
  caps: ProcurementMasterCapabilities,
  resource: MasterResource,
  hasPermission: (code: string) => boolean,
): boolean {
  if (resource === 'material-categories') return caps.canViewMaterialCategories;
  if (resource === 'vendor-categories') return caps.canViewVendorCategories;
  return hasPermission('procurement_master.view');
}

export function canManageResource(
  caps: ProcurementMasterCapabilities,
  resource: MasterResource,
  hasPermission: (code: string) => boolean,
): boolean {
  if (resource === 'material-categories') return caps.canManageMaterialCategories;
  if (resource === 'vendor-categories') return caps.canManageVendorCategories;
  return hasPermission('procurement_master.manage');
}
