import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelTender,
  createContractorTender,
  fetchContractorTenders,
  inviteContractors,
  recordTenderBid,
  type CreateContractorTenderInput,
  type InviteContractorsInput,
  type ListContractorTendersQuery,
  type RecordBidInput,
} from './api';

export const contractorTenderKeys = {
  all: ['contractor-tenders'] as const,
  list: (query: ListContractorTendersQuery) =>
    [...contractorTenderKeys.all, 'list', query] as const,
};

export function useContractorTendersList(
  query: ListContractorTendersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorTenderKeys.list(query),
    queryFn: () => fetchContractorTenders(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    void qc.invalidateQueries({ queryKey: contractorTenderKeys.all });
}

export function useCreateContractorTender() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateContractorTenderInput) =>
      createContractorTender(input),
    onSuccess: invalidate,
  });
}

export function useInviteContractors() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: InviteContractorsInput;
    }) => inviteContractors(id, input),
    onSuccess: invalidate,
  });
}

export function useCancelContractorTender() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string | null }) =>
      cancelTender(id, reason),
    onSuccess: invalidate,
  });
}

export function useRecordTenderBid() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecordBidInput }) =>
      recordTenderBid(id, input),
    onSuccess: invalidate,
  });
}
