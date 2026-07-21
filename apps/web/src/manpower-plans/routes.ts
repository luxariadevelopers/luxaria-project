/**
 * Canonical contractor manpower plan paths.
 */

export const MANPOWER_PLAN_ROUTES = {
  list: '/contractors/manpower-plans',
  detail: (planId: string) =>
    `/contractors/manpower-plans/${encodeURIComponent(planId)}`,
  shortfall: '/contractors/manpower-shortfall',
} as const;

export function manpowerPlansListPath(): string {
  return MANPOWER_PLAN_ROUTES.list;
}

export function manpowerPlanDetailPath(planId: string): string {
  return MANPOWER_PLAN_ROUTES.detail(planId);
}

export function manpowerShortfallPath(): string {
  return MANPOWER_PLAN_ROUTES.shortfall;
}
