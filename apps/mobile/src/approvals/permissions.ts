export const APPROVAL_PERMISSIONS = {
  view: 'approval.view',
  act: 'approval.act',
} as const;

export function resolveApprovalCapabilities(hasPermission: (c: string) => boolean) {
  return {
    canView: hasPermission(APPROVAL_PERMISSIONS.view),
    canAct: hasPermission(APPROVAL_PERMISSIONS.act),
  };
}
