import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompanyAddressHistory,
  fetchCompanyCapitalHistory,
  fetchCurrentCompany,
  updateCompanyCapital,
  updateCompanyProfile,
  updateCompanyStatutory,
  uploadCompanyLogo,
} from './api';
import type {
  ListAddressHistoryQuery,
  ListCapitalHistoryQuery,
  UpdateCapitalInput,
  UpdateCompanyInput,
  UpdateStatutoryInput,
} from './types';

export const companyAdminKeys = {
  all: ['company-admin'] as const,
  currentRoot: () => ['company-admin', 'current'] as const,
  current: (authenticatedCompanyId: string | null) =>
    [...companyAdminKeys.currentRoot(), authenticatedCompanyId ?? 'primary'] as const,
  historyRoot: (companyId: string) => ['company-admin', 'history', companyId] as const,
  addressHistory: (companyId: string, query: ListAddressHistoryQuery) =>
    [...companyAdminKeys.historyRoot(companyId), 'address', query] as const,
  capitalHistory: (companyId: string, query: ListCapitalHistoryQuery) =>
    [...companyAdminKeys.historyRoot(companyId), 'capital', query] as const,
};

export function useCurrentCompany(
  authenticatedCompanyId: string | null | undefined,
  enabled = true,
) {
  const tenantId = authenticatedCompanyId ?? null;
  return useQuery({
    queryKey: companyAdminKeys.current(tenantId),
    queryFn: () => fetchCurrentCompany(tenantId),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useCompanyAddressHistory(
  companyId: string | undefined,
  query: ListAddressHistoryQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: companyAdminKeys.addressHistory(companyId ?? '', query),
    queryFn: () => fetchCompanyAddressHistory(companyId!, query),
    enabled: Boolean(companyId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCompanyCapitalHistory(
  companyId: string | undefined,
  query: ListCapitalHistoryQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: companyAdminKeys.capitalHistory(companyId ?? '', query),
    queryFn: () => fetchCompanyCapitalHistory(companyId!, query),
    enabled: Boolean(companyId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useCompanyMutationInvalidation(companyId: string) {
  const queryClient = useQueryClient();
  return async (includeHistory: boolean) => {
    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: companyAdminKeys.currentRoot(),
      }),
    ];
    if (includeHistory) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: companyAdminKeys.historyRoot(companyId),
        }),
      );
    }
    await Promise.all(invalidations);
  };
}

export function useUpdateCompanyProfile(companyId: string) {
  const invalidate = useCompanyMutationInvalidation(companyId);
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => updateCompanyProfile(companyId, input),
    onSuccess: () => invalidate(true),
  });
}

export function useUpdateCompanyStatutory(companyId: string) {
  const invalidate = useCompanyMutationInvalidation(companyId);
  return useMutation({
    mutationFn: (input: UpdateStatutoryInput) => updateCompanyStatutory(companyId, input),
    onSuccess: () => invalidate(false),
  });
}

export function useUpdateCompanyCapital(companyId: string) {
  const invalidate = useCompanyMutationInvalidation(companyId);
  return useMutation({
    mutationFn: (input: UpdateCapitalInput) => updateCompanyCapital(companyId, input),
    onSuccess: () => invalidate(true),
  });
}

export function useUploadCompanyLogo(companyId: string) {
  const invalidate = useCompanyMutationInvalidation(companyId);
  return useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(companyId, file),
    onSuccess: () => invalidate(false),
  });
}
