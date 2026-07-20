/**
 * Project workflow statuses — mirrors
 * `apps/backend/src/modules/projects/schemas/project.schema.ts` `ProjectStatus`.
 */
export const ProjectStatus = {
  Planning: 'Planning',
  Approval: 'Approval',
  PreConstruction: 'Pre-Construction',
  Construction: 'Construction',
  OnHold: 'On Hold',
  Completed: 'Completed',
  Closed: 'Closed',
  Cancelled: 'Cancelled',
} as const;

export type ProjectStatusType =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];

/**
 * Statuses allowed for an active project selection used by operational UI.
 * Terminal `Closed` / `Cancelled` are rejected (matching backend workflow gates).
 */
export const SELECTABLE_PROJECT_STATUSES: readonly ProjectStatusType[] = [
  ProjectStatus.Planning,
  ProjectStatus.Approval,
  ProjectStatus.PreConstruction,
  ProjectStatus.Construction,
  ProjectStatus.OnHold,
  ProjectStatus.Completed,
] as const;

const SELECTABLE_SET = new Set<string>(SELECTABLE_PROJECT_STATUSES);

/** True when status is known and not Closed/Cancelled. Unknown → not selectable. */
export function isSelectableProjectStatus(
  status: string | null | undefined,
): boolean {
  if (!status) {
    return false;
  }
  return SELECTABLE_SET.has(status);
}
