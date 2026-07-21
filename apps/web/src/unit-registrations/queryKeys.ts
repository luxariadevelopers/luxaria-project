import type { ListUnitRegistrationsQuery } from './types';

export const unitRegistrationsKeys = {
  all: ['unit-registrations'] as const,
  list: (query: ListUnitRegistrationsQuery) =>
    [...unitRegistrationsKeys.all, 'list', query] as const,
};
