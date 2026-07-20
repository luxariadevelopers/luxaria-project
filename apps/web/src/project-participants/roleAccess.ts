export type ProjectParticipantCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  /**
   * Prompt alias `project_participant.manage` is not in the Nest catalog.
   * Treat manage as create or update.
   */
  canManage: boolean;
};

/**
 * Nest RBAC codes from `permissions.catalog.ts`.
 * There is no `project_participant.manage`.
 */
export function resolveParticipantCapabilities(
  hasPermission: (code: string) => boolean,
): ProjectParticipantCapabilities {
  const canView = hasPermission('project_participant.view');
  const canCreate = hasPermission('project_participant.create');
  const canUpdate = hasPermission('project_participant.update');
  return {
    canView,
    canCreate,
    canUpdate,
    canManage: canCreate || canUpdate,
  };
}
