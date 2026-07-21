export const EXPENSE_PERMISSIONS = {
  view: 'expense.view',
  create: 'expense.create',
  approve: 'expense.approve',
} as const;

export function resolveExpenseCapabilities(hasPermission: (c: string) => boolean) {
  return {
    canView: hasPermission(EXPENSE_PERMISSIONS.view),
    canCreate: hasPermission(EXPENSE_PERMISSIONS.create),
    canApprove: hasPermission(EXPENSE_PERMISSIONS.approve),
  };
}
