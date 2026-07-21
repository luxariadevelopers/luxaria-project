import type { ListCostCentresQuery } from './types';

export const costCentresKeys = {
  all: ['cost-centres'] as const,
  list: (query: ListCostCentresQuery) =>
    [...costCentresKeys.all, 'list', query] as const,
};
