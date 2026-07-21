import type { ListUnitQuotationsQuery } from './types';

export const unitQuotationsKeys = {
  all: ['unit-quotations'] as const,
  list: (query: ListUnitQuotationsQuery) =>
    [...unitQuotationsKeys.all, 'list', query] as const,
};
