/**
 * Nest RBAC for Labour Categories (exact catalog):
 * - `labour_category.view` — list/get/resolve-rate/list rates
 * - `labour_category.manage` — create/update/activate/deactivate/seed/rate CRUD
 *
 * Phase prompt aliases match Nest codes (no remapping needed).
 */
export type LabourCategoryCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveLabourCategoryCapabilities(
  hasPermission: (code: string) => boolean,
): LabourCategoryCapabilities {
  return {
    canView: hasPermission('labour_category.view'),
    canManage: hasPermission('labour_category.manage'),
  };
}
