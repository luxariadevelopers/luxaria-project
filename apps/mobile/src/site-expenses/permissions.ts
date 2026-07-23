export const EXPENSE_PERMISSIONS = {
  view: 'expense.view',
  create: 'expense.create',
  approve: 'expense.approve',
  post: 'expense.post',
} as const;

export type ExpenseCapabilities = {
  canView: boolean;
  /** Create, update draft/returned, submit, cancel. */
  canCreate: boolean;
  /** Verify, approve, reject, return. */
  canApprove: boolean;
  canPost: boolean;
  /** Alias of `canApprove` for verify action clarity. */
  canVerify: boolean;
  /** Alias of `canCreate` for cancel action clarity. */
  canCancel: boolean;
};

export function resolveExpenseCapabilities(
  hasPermission: (code: string) => boolean,
): ExpenseCapabilities {
  const canApprove = hasPermission(EXPENSE_PERMISSIONS.approve);
  const canCreate = hasPermission(EXPENSE_PERMISSIONS.create);
  return {
    canView: hasPermission(EXPENSE_PERMISSIONS.view),
    canCreate,
    canApprove,
    canPost: hasPermission(EXPENSE_PERMISSIONS.post),
    canVerify: canApprove,
    canCancel: canCreate,
  };
}
