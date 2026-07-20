import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { searchContractors } from '@/api/searchLists';
import {
  acknowledgeExpiryAlert,
  amendContractorAgreement,
  approveContractorAgreement,
  createContractorAgreement,
  fetchAgreementVersions,
  fetchContractorAgreement,
  fetchContractorAgreements,
  fetchExpiryAlerts,
  rejectContractorAgreement,
  submitContractorAgreement,
  terminateContractorAgreement,
  updateContractorAgreement,
} from './api';
import { contractorAgreementsKeys } from './queryKeys';
import type {
  AmendContractorAgreementInput,
  CreateContractorAgreementInput,
  ListContractorAgreementsQuery,
  ListExpiryAlertsQuery,
  UpdateContractorAgreementInput,
} from './types';

export function useContractorAgreementsList(
  query: ListContractorAgreementsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorAgreementsKeys.list(query),
    queryFn: () => fetchContractorAgreements(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useContractorAgreementDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorAgreementsKeys.detail(id ?? ''),
    queryFn: () => fetchContractorAgreement(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useAgreementVersions(
  agreementNumber: string | undefined,
  projectId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorAgreementsKeys.versions(
      agreementNumber ?? '',
      projectId,
    ),
    queryFn: () => fetchAgreementVersions(agreementNumber!, projectId),
    enabled: Boolean(agreementNumber) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useExpiryAlerts(
  query: ListExpiryAlertsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: contractorAgreementsKeys.expiryAlerts(query),
    queryFn: () => fetchExpiryAlerts(query),
    enabled,
    staleTime: 30_000,
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

function invalidateAgreementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.invalidateQueries({
    queryKey: contractorAgreementsKeys.all,
  });
}

export function useCreateContractorAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractorAgreementInput) =>
      createContractorAgreement(input),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}

export function useUpdateContractorAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateContractorAgreementInput;
    }) => updateContractorAgreement(id, input),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}

export function useAmendContractorAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: AmendContractorAgreementInput;
    }) => amendContractorAgreement(id, input ?? {}),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}

export function useSubmitContractorAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitContractorAgreement(id),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}

export function useApproveContractorAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approveContractorAgreement(id, comment),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}

export function useRejectContractorAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectContractorAgreement(id, reason),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}

export function useTerminateContractorAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      terminateContractorAgreement(id, reason),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}

export function useAcknowledgeExpiryAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => acknowledgeExpiryAlert(alertId),
    onSuccess: () => invalidateAgreementQueries(queryClient),
  });
}
