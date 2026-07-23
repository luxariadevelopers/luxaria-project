/**
 * Nest RBAC for material reconciliation:
 * - `contractor_recovery.view` — list / get
 * - `contractor_recovery.manage` — create, update, approve, post-to-bill
 * - `running_bill.view` — bill picker for post-to-bill
 */
export type MaterialReconciliationCapabilities = {
  canView: boolean;
  canManage: boolean;
  canViewContractors: boolean;
  canViewMaterials: boolean;
  /** Bill list for post-to-bill — Nest `running_bill.view`. */
  canViewBills: boolean;
};

export function resolveMaterialReconciliationCapabilities(
  hasPermission: (code: string) => boolean,
): MaterialReconciliationCapabilities {
  return {
    canView: hasPermission('contractor_recovery.view'),
    canManage: hasPermission('contractor_recovery.manage'),
    canViewContractors: hasPermission('contractor.view'),
    canViewMaterials: hasPermission('material.view'),
    canViewBills: hasPermission('running_bill.view'),
  };
}
