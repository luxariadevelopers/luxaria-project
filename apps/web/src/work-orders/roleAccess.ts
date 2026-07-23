export type WorkOrderCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canIssue: boolean;
  canClose: boolean;
};

/**
 * Nest RBAC — `work_order.view|create|approve|issue|close`.
 */
export function resolveWorkOrderCapabilities(
  hasPermission: (code: string) => boolean,
): WorkOrderCapabilities {
  return {
    canView: hasPermission('work_order.view'),
    canCreate: hasPermission('work_order.create'),
    canApprove: hasPermission('work_order.approve'),
    canIssue: hasPermission('work_order.issue'),
    canClose: hasPermission('work_order.close'),
  };
}
