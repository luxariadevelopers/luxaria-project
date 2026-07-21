import type { ListMastersQuery, MasterResource } from './types';

export const procurementMasterKeys = {
  all: ['procurement-masters'] as const,
  list: (resource: MasterResource, query: ListMastersQuery) =>
    [...procurementMasterKeys.all, 'list', resource, query] as const,
};
