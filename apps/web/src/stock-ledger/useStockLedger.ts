import { useQuery } from '@tanstack/react-query';
import { fetchStockLedger, fetchStockLedgerEntry } from './api';
import { stockLedgerKeys } from './queryKeys';
import type { ListStockLedgerQuery } from './types';

export function useStockLedgerList(
  query: ListStockLedgerQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: stockLedgerKeys.list(query),
    queryFn: () => fetchStockLedger(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useStockLedgerEntry(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: stockLedgerKeys.detail(id ?? ''),
    queryFn: () => fetchStockLedgerEntry(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}
