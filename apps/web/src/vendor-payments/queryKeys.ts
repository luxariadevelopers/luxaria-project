import type { ListVendorPaymentsQuery } from './types';

export const vendorPaymentsKeys = {
  all: ['vendor-payments'] as const,
  lists: () => [...vendorPaymentsKeys.all, 'list'] as const,
  list: (query: ListVendorPaymentsQuery) =>
    [...vendorPaymentsKeys.lists(), query] as const,
  details: () => [...vendorPaymentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorPaymentsKeys.details(), id] as const,
  payableInvoices: (projectId: string, vendorId: string) =>
    [
      ...vendorPaymentsKeys.all,
      'payable-invoices',
      projectId,
      vendorId,
    ] as const,
  bankAccounts: (projectId: string) =>
    [...vendorPaymentsKeys.all, 'bank-accounts', projectId] as const,
  vendors: (search: string) =>
    [...vendorPaymentsKeys.all, 'vendors', search] as const,
};
