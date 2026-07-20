/**
 * Nest permissions for materials
 * (`apps/backend/docs/MATERIALS_API.md`):
 * - `material.view` — list, get, units
 * - `material.manage` — create, update
 *
 * Prompt alias `material.update` maps to `material.manage` (no separate Nest code).
 *
 * Project stock cards / usage use Stock Ledger:
 * - `stock.view` — balance + ledger list
 */

export type MaterialCapabilities = {
  canView: boolean;
  canManage: boolean;
  canViewStock: boolean;
};

export function resolveMaterialCapabilities(
  hasPermission: (code: string) => boolean,
): MaterialCapabilities {
  return {
    canView: hasPermission('material.view'),
    canManage: hasPermission('material.manage'),
    canViewStock: hasPermission('stock.view'),
  };
}
