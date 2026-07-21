import { useQuery } from '@tanstack/react-query';
import { fetchGstDocuments, fetchGstReturns } from './api';
import { gstKeys } from './queryKeys';
import type { ListGstDocumentsQuery, ListGstReturnsQuery } from './types';

export function useGstDocumentsList(query: ListGstDocumentsQuery, enabled = true) {
  return useQuery({
    queryKey: gstKeys.documents(query),
    queryFn: () => fetchGstDocuments(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useGstReturnsList(query: ListGstReturnsQuery, enabled = true) {
  return useQuery({
    queryKey: gstKeys.returns(query),
    queryFn: () => fetchGstReturns(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
