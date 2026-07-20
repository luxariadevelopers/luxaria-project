import type { ListQuotationComparisonsQuery } from './types';

export const quotationComparisonsKeys = {
  all: ['quotation-comparisons'] as const,
  list: (query: ListQuotationComparisonsQuery) =>
    [...quotationComparisonsKeys.all, 'list', query] as const,
  detail: (id: string) =>
    [...quotationComparisonsKeys.all, 'detail', id] as const,
  forPr: (prId: string) =>
    [...quotationComparisonsKeys.all, 'pr', prId] as const,
};
