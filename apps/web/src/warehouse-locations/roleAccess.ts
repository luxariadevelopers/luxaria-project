export type WarehouseLocationCapabilities = {
  /** List / get — Nest `site.view` */
  canView: boolean;
  /** Create / update — Nest `site.manage` */
  canManage: boolean;
};

/**
 * Nest RBAC — exact codes from Warehouse Locations controller.
 */
export function resolveWarehouseLocationCapabilities(
  hasPermission: (code: string) => boolean,
): WarehouseLocationCapabilities {
  return {
    canView: hasPermission('site.view'),
    canManage: hasPermission('site.manage'),
  };
}
