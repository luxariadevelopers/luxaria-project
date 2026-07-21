import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelRfq,
  closeRfq,
  createRfq,
  fetchRfq,
  fetchRfqResponses,
  fetchRfqs,
  issueRfq,
} from './api';
import { rfqKeys } from './queryKeys';
import type { CreateRfqInput, ListRfqsQuery } from './types';

export function useRfqsList(query: ListRfqsQuery, enabled = true) {
  return useQuery({
    queryKey: rfqKeys.list(query),
    queryFn: () => fetchRfqs(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useRfqDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: rfqKeys.detail(id ?? ''),
    queryFn: () => fetchRfq(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useRfqResponses(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: rfqKeys.responses(id ?? ''),
    queryFn: () => fetchRfqResponses(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRfqInput) => createRfq(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rfqKeys.all });
    },
  });
}

export function useIssueRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => issueRfq(id),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: rfqKeys.all });
      void qc.invalidateQueries({ queryKey: rfqKeys.detail(row.id) });
    },
  });
}

export function useCloseRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeRfq(id),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: rfqKeys.all });
      void qc.invalidateQueries({ queryKey: rfqKeys.detail(row.id) });
    },
  });
}

export function useCancelRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelRfq(id),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: rfqKeys.all });
      void qc.invalidateQueries({ queryKey: rfqKeys.detail(row.id) });
    },
  });
}
