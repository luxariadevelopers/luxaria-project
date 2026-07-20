/** Canonical Project Control work measurement paths (Micro Phase 081). */

export const WORK_MEASUREMENT_ROUTES = {
  list: '/project-control/work-measurements',
} as const;

export function workMeasurementsListPath(): string {
  return WORK_MEASUREMENT_ROUTES.list;
}
