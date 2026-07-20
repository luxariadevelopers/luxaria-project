/** Canonical detail URL for deep links from the materials catalogue (Phase 058). */
export function materialDetailPath(materialId: string): string {
  return `/inventory/materials/${materialId}`;
}

export const MATERIALS_LIST_PATH = '/inventory/materials';
