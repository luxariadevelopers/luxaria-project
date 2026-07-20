import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFinancialYearFilterOptions } from '@/director-command-centre/api';
import {
  cancelJournal,
  createJournal,
  fetchJournal,
  fetchJournals,
  postJournal,
  reverseJournal,
  submitJournal,
  updateJournal,
} from './api';
import { journalsKeys } from './queryKeys';
import type {
  CancelJournalInput,
  CreateJournalInput,
  ListJournalsQuery,
  ReverseJournalInput,
  UpdateJournalInput,
} from './types';

export function useJournalsList(query: ListJournalsQuery, enabled = true) {
  return useQuery({
    queryKey: journalsKeys.list(query),
    queryFn: () => fetchJournals(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useJournalDetail(
  journalId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: journalsKeys.detail(journalId ?? ''),
    queryFn: () => fetchJournal(journalId!),
    enabled: Boolean(journalId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

/** FY filter options — requires `financial_year.view`. */
export function useFinancialYearOptions(enabled = true) {
  return useQuery({
    queryKey: [...journalsKeys.all, 'financial-years'],
    queryFn: () => fetchFinancialYearFilterOptions(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateJournals() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: journalsKeys.all });
  };
}

export function useCreateJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (input: CreateJournalInput) => createJournal(input),
    onSuccess: invalidate,
  });
}

export function useUpdateJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateJournalInput }) =>
      updateJournal(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (id: string) => submitJournal(id),
    onSuccess: invalidate,
  });
}

export function usePostJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (id: string) => postJournal(id),
    onSuccess: invalidate,
  });
}

export function useReverseJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReverseJournalInput }) =>
      reverseJournal(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (args: { id: string; input?: CancelJournalInput }) =>
      cancelJournal(args.id, args.input),
    onSuccess: invalidate,
  });
}
