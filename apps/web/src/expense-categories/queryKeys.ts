export const expenseCategoryKeys = {
  all: ['expense-categories'] as const,
  tree: (status?: string) =>
    [...expenseCategoryKeys.all, 'tree', status ?? 'all'] as const,
  detail: (id: string) => [...expenseCategoryKeys.all, 'detail', id] as const,
  list: (query: string) =>
    [...expenseCategoryKeys.all, 'list', query] as const,
  ledgerOptions: () =>
    [...expenseCategoryKeys.all, 'ledger-options'] as const,
};
