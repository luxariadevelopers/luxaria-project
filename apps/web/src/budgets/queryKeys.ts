import type { ListBudgetsQuery } from './types';

export const budgetsKeys = {
  all: ['budgets'] as const,
  list: (query: ListBudgetsQuery) => [...budgetsKeys.all, 'list', query] as const,
};
