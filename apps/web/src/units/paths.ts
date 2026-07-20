/** Canonical detail URL for deep links from the unit inventory list (Phase 097). */
export function unitDetailPath(unitId: string): string {
  return `/sales/units/${unitId}`;
}

export const UNITS_LIST_PATH = '/sales/units';
