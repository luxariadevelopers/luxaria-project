export type ExpenseCategoryCapabilities = {
  canView: boolean;
  /**
   * Nest has no `expense_category.create` / `expense_category.update`.
   * All mutations use `expense_category.manage`.
   */
  canManage: boolean;
};

export function resolveExpenseCategoryCapabilities(
  hasPermission: (code: string) => boolean,
): ExpenseCategoryCapabilities {
  return {
    canView: hasPermission('expense_category.view'),
    canManage: hasPermission('expense_category.manage'),
  };
}
