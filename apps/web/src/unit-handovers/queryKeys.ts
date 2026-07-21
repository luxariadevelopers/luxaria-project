import type { ListUnitHandoversQuery } from './types';

export const unitHandoversKeys = {
  all: ['unit-handovers'] as const,
  list: (query: ListUnitHandoversQuery) =>
    [...unitHandoversKeys.all, 'list', query] as const,
};
