/**
 * Nest permissions for material consumption reports
 * (`material-consumption.controller.ts`):
 * - `material_consumption.view` — preview, list, get
 * - `material_consumption.manage` — generate, update explanations, submit, cancel
 * - `material_consumption.approve` — approve submitted reports with variance
 *
 * Prompt alias `material_variance.*` does **not** exist in the catalog.
 * Explain/submit maps to `.manage`; approve maps to `.approve`.
 */

export type MaterialVarianceCapabilities = {
  canView: boolean;
  canManage: boolean;
  canApprove: boolean;
};

export function resolveMaterialVarianceCapabilities(
  hasPermission: (code: string) => boolean,
): MaterialVarianceCapabilities {
  return {
    canView: hasPermission('material_consumption.view'),
    canManage: hasPermission('material_consumption.manage'),
    canApprove: hasPermission('material_consumption.approve'),
  };
}

/** Draft/submitted reports allow explanation edits when user can manage. */
export function canEditExplanations(
  caps: MaterialVarianceCapabilities,
  status: string,
): boolean {
  return (
    caps.canManage &&
    (status === 'draft' || status === 'submitted')
  );
}

/** Approve only when submitted and user has approve permission. */
export function canApproveReport(
  caps: MaterialVarianceCapabilities,
  status: string,
): boolean {
  return caps.canApprove && status === 'submitted';
}

/** Submit only from draft when user can manage. */
export function canSubmitReport(
  caps: MaterialVarianceCapabilities,
  status: string,
): boolean {
  return caps.canManage && status === 'draft';
}

/** Cancel open reports before approval. */
export function canCancelReport(
  caps: MaterialVarianceCapabilities,
  status: string,
): boolean {
  return (
    caps.canManage &&
    (status === 'draft' || status === 'submitted')
  );
}
