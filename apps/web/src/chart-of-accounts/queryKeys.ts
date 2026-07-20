export const chartOfAccountsKeys = {
  all: ['chart-of-accounts'] as const,
  tree: (status?: string) =>
    [...chartOfAccountsKeys.all, 'tree', status ?? 'all'] as const,
  detail: (id: string) => [...chartOfAccountsKeys.all, 'detail', id] as const,
};
