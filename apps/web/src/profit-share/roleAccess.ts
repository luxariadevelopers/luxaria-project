export type ProfitShareCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canSubmit: boolean;
  canApprove: boolean;
};

/**
 * Nest catalog has no `profit_share.*` codes.
 * Prompt aliases map to `project_participant.create|submit|approve` (+ view/update).
 */
export function resolveProfitShareCapabilities(
  hasPermission: (code: string) => boolean,
): ProfitShareCapabilities {
  return {
    canView: hasPermission('project_participant.view'),
    canCreate: hasPermission('project_participant.create'),
    canUpdate: hasPermission('project_participant.update'),
    canSubmit: hasPermission('project_participant.submit'),
    canApprove: hasPermission('project_participant.approve'),
  };
}
