export type BoqCapabilities = {
  canView: boolean;
  /** Create/update items & versions, submit, activate, Excel import — Nest `boq.manage`. */
  canManage: boolean;
  /** Nest import permission is `boq.manage` (no `boq.import` in catalog). */
  canImport: boolean;
  /** Approve / reject pending versions — Nest `boq.approve`. */
  canApprove: boolean;
};

/**
 * Nest RBAC — exact codes are `boq.view`, `boq.manage`, `boq.approve`.
 * Prompt aliases `boq.create` / `boq.update` / `boq_version.*` / `boq.import`
 * are not catalogued.
 */
export function resolveBoqCapabilities(
  hasPermission: (code: string) => boolean,
): BoqCapabilities {
  const canManage = hasPermission('boq.manage');
  return {
    canView: hasPermission('boq.view'),
    canManage,
    canImport: canManage,
    canApprove: hasPermission('boq.approve'),
  };
}
