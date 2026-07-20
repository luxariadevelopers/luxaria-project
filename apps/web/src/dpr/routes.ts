/**
 * Canonical Project Control DPR paths (Micro Phase 082 list, 083 detail).
 */

export const DPR_ROUTES = {
  list: '/project-control/dpr',
  detail: (id: string) =>
    `/project-control/dpr/${encodeURIComponent(id)}`,
  legacyList: '/daily-progress-reports',
} as const;

export function dprListPath(): string {
  return DPR_ROUTES.list;
}

export function dprDetailPath(id: string): string {
  return DPR_ROUTES.detail(id);
}
