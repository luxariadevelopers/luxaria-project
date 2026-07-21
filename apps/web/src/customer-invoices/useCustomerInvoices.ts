import { useQuery } from '@tanstack/react-query';
import { fetchCustomerInvoices } from './api';
import { customerInvoicesKeys } from './queryKeys';
import type { ListCustomerInvoicesQuery } from './types';

export function useCustomerInvoicesList(
  query: ListCustomerInvoicesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: customerInvoicesKeys.list(query),
    queryFn: () => fetchCustomerInvoices(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
