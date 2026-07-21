import type { ListSaleAgreementsQuery } from './types';

export const saleAgreementsKeys = {
  all: ['sale-agreements'] as const,
  list: (query: ListSaleAgreementsQuery) =>
    [...saleAgreementsKeys.all, 'list', query] as const,
};
