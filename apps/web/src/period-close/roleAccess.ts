/**
 * Nest permissions for Accounting Period Closure (not `period_close.*`):
 * - view → `period_closure.view`
 * - lock / validate / close / create → `period_closure.manage`
 * - reopen request → `period_closure.reopen`
 * - approve / reject reopen → `period_closure.approve_reopen`
 */
export type PeriodCloseCapabilities = {
  canView: boolean;
  canManage: boolean;
  canLock: boolean;
  canReopen: boolean;
  canApproveReopen: boolean;
};

export function resolvePeriodCloseCapabilities(
  hasPermission: (code: string) => boolean,
): PeriodCloseCapabilities {
  const canManage = hasPermission('period_closure.manage');
  return {
    canView: hasPermission('period_closure.view'),
    canManage,
    /** Nest lock/validate/close use `period_closure.manage`. */
    canLock: canManage,
    canReopen: hasPermission('period_closure.reopen'),
    canApproveReopen: hasPermission('period_closure.approve_reopen'),
  };
}
