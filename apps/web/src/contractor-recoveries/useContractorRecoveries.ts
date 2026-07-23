import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { searchContractors } from '@/api/searchLists';
import {
  approveContractorRecovery,
  createContractorRecovery,
  getContractorRecovery,
  listContractorRecoveries,
  postContractorRecovery,
  type CreateContractorRecoveryInput,
  type ListContractorRecoveriesQuery,
} from './api';
import { contractorRecoveriesKeys } from './queryKeys';

export function useContractorRecoveriesList(
  query: ListContractorRecoveriesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorRecoveriesKeys.list(query),
    queryFn: () => listContractorRecoveries(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useContractorRecoveryDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorRecoveriesKeys.detail(id ?? ''),
    queryFn: () => getContractorRecovery(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useContractorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: ['contractor-search', search],
    queryFn: async () => {
      const rows = await searchContractors({ search, limit: 50 });
      return rows.map((row) => ({
        id: row.id,
        label: [row.contractorCode, row.legalName].filter(Boolean).join(' — '),
      }));
    },
    enabled,
    staleTime: 60_000,
  });
}

function invalidate(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.invalidateQueries({
    queryKey: contractorRecoveriesKeys.all,
  });
}

export function useCreateContractorRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractorRecoveryInput) =>
      createContractorRecovery(input),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useApproveContractorRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveContractorRecovery(id),
    onSuccess: () => invalidate(queryClient),
  });
}

export function usePostContractorRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      billId,
    }: {
      id: string;
      billId?: string | null;
    }) => postContractorRecovery(id, billId),
    onSuccess: () => invalidate(queryClient),
  });
}
