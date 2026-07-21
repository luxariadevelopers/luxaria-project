import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createLead,
  fetchLead,
  fetchLeads,
  transitionLead,
} from './api';
import { leadsKeys } from './queryKeys';
import type {
  CreateLeadInput,
  ListLeadsQuery,
  TransitionLeadInput,
} from './types';

export function useLeadsList(query: ListLeadsQuery, enabled = true) {
  return useQuery({
    queryKey: leadsKeys.list(query),
    queryFn: () => fetchLeads(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useLeadDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: leadsKeys.detail(id ?? ''),
    queryFn: () => fetchLead(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadsKeys.all });
    },
  });
}

export function useTransitionLead(leadId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: TransitionLeadInput }) =>
      transitionLead(args.id, args.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: leadsKeys.all });
      void qc.invalidateQueries({
        queryKey: leadsKeys.detail(leadId ?? vars.id),
      });
    },
  });
}
