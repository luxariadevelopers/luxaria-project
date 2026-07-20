export type MaterialCoefficientCapabilities = {
  canView: boolean;
  canManage: boolean;
  canApprove: boolean;
};

/**
 * Nest RBAC — exact codes from permission catalog:
 * `material_consumption.view` | `.manage` | `.approve`
 */
export function resolveMaterialCoefficientCapabilities(
  hasPermission: (code: string) => boolean,
): MaterialCoefficientCapabilities {
  return {
    canView: hasPermission('material_consumption.view'),
    canManage: hasPermission('material_consumption.manage'),
    canApprove: hasPermission('material_consumption.approve'),
  };
}
