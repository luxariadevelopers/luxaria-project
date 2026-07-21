import type { ListCustomerInvoicesQuery } from './types';

export const customerInvoicesKeys = {
  all: ['customer-invoices'] as const,
  list: (query: ListCustomerInvoicesQuery) =>
    [...customerInvoicesKeys.all, 'list', query] as const,
};
