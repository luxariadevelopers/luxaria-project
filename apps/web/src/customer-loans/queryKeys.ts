import type { ListCustomerLoansQuery } from './types';

export const customerLoansKeys = {
  all: ['customer-loans'] as const,
  list: (query: ListCustomerLoansQuery) =>
    [...customerLoansKeys.all, 'list', query] as const,
};
