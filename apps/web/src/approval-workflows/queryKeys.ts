export const approvalWorkflowKeys = {
  all: ['approval-workflows'] as const,
  detail: (module: string, entityType: string) =>
    [...approvalWorkflowKeys.all, module, entityType] as const,
};
