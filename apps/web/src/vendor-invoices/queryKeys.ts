import type { ListVendorInvoicesQuery } from './types';

export const vendorInvoicesKeys = {
  all: ['vendor-invoices'] as const,
  lists: () => [...vendorInvoicesKeys.all, 'list'] as const,
  list: (query: ListVendorInvoicesQuery) =>
    [...vendorInvoicesKeys.lists(), query] as const,
  details: () => [...vendorInvoicesKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorInvoicesKeys.details(), id] as const,
  invoiceablePos: (projectId: string, vendorId: string) =>
    [...vendorInvoicesKeys.all, 'invoiceable-pos', projectId, vendorId] as const,
  invoiceableGrns: (purchaseOrderId: string) =>
    [
      ...vendorInvoicesKeys.all,
      'invoiceable-grns',
      purchaseOrderId,
    ] as const,
  vendors: (search: string) =>
    [...vendorInvoicesKeys.all, 'vendors', search] as const,
};
