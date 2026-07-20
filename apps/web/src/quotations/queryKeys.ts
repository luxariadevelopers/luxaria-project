import type { ListVendorQuotationsQuery } from './types';

export const quotationsKeys = {
  all: ['vendor-quotations'] as const,
  lists: () => [...quotationsKeys.all, 'list'] as const,
  list: (query: ListVendorQuotationsQuery) =>
    [...quotationsKeys.lists(), query] as const,
  details: () => [...quotationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotationsKeys.details(), id] as const,
  eligiblePrs: (projectId: string) =>
    [...quotationsKeys.all, 'eligible-prs', projectId] as const,
  purchaseRequest: (id: string) =>
    [...quotationsKeys.all, 'purchase-request', id] as const,
  vendors: (search: string) =>
    [...quotationsKeys.all, 'vendors', search] as const,
};
