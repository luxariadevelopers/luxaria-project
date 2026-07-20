/**
 * Nest RBAC for Daily Progress Reports (exact catalog):
 * - `dpr.view` — list/get, missing alerts
 * - `dpr.create` — create, update, submit
 * - `dpr.review` — review, reopen, regenerate PDF, evaluate alerts
 */
export type DprCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canReview: boolean;
  canReopen: boolean;
  canRegeneratePdf: boolean;
};

export function resolveDprCapabilities(
  hasPermission: (code: string) => boolean,
): DprCapabilities {
  const canReview = hasPermission('dpr.review');
  return {
    canView: hasPermission('dpr.view'),
    canCreate: hasPermission('dpr.create'),
    canReview,
    canReopen: canReview,
    canRegeneratePdf: canReview,
  };
}
