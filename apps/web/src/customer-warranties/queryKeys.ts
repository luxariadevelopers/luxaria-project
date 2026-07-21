import type { ListCustomerWarrantiesQuery } from './types';

export const customerWarrantiesKeys = {
  all: ['customer-warranties'] as const,
  list: (query: ListCustomerWarrantiesQuery) =>
    [...customerWarrantiesKeys.all, 'list', query] as const,
};
