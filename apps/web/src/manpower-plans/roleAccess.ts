/**
 * Nest RBAC for Manpower Daily Plans (exact catalog):
 * - `manpower_plan.view` — list/get plans, compare
 * - `manpower_plan.manage` — create/update plans
 */
export type ManpowerPlanCapabilities = {
  canView: boolean;
  canManage: boolean;
};

export function resolveManpowerPlanCapabilities(
  hasPermission: (code: string) => boolean,
): ManpowerPlanCapabilities {
  return {
    canView: hasPermission('manpower_plan.view'),
    canManage: hasPermission('manpower_plan.manage'),
  };
}
