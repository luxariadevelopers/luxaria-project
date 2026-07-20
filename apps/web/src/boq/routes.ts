/**
 * Canonical Project Control BOQ paths.
 * List/import = Phases 077–078; item editor = 079; versions = 080.
 */

export const BOQ_ROUTES = {
  list: '/project-control/boq',
  import: '/project-control/boq/import',
  itemEditor: (id: string) =>
    `/project-control/boq/items/${encodeURIComponent(id)}`,
  itemCreate: '/project-control/boq/items/new',
  versions: '/project-control/boq/versions',
} as const;

export function boqItemEditorPath(id: string): string {
  return BOQ_ROUTES.itemEditor(id);
}

export function boqListPath(): string {
  return BOQ_ROUTES.list;
}

export function boqVersionsPath(): string {
  return BOQ_ROUTES.versions;
}
