export type ApprovalWorkflowCapabilities = {
  canConfigure: boolean;
};

export function resolveApprovalWorkflowCapabilities(
  hasPermission: (code: string) => boolean,
): ApprovalWorkflowCapabilities {
  return {
    canConfigure: hasPermission('approval.configure'),
  };
}
