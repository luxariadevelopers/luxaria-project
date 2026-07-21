import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createMaster,
  fetchMasterList,
  seedProcurementMasterDefaults,
  updateMaster,
} from './api';
import { procurementMasterKeys } from './queryKeys';
import type {
  ListMastersQuery,
  MasterResource,
  MasterRow,
} from './types';

export function useMasterList(
  resource: MasterResource,
  query: ListMastersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: procurementMasterKeys.list(resource, query),
    queryFn: () => fetchMasterList(resource, query),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreateMaster(resource: MasterResource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      createMaster(
        resource as 'purchase-categories',
        input as { code: string; name: string },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementMasterKeys.all });
    },
  });
}

export function useUpdateMaster(resource: MasterResource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Record<string, unknown>;
    }) => updateMaster(resource, id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementMasterKeys.all });
    },
  });
}

export function useSeedMasterDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => seedProcurementMasterDefaults(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: procurementMasterKeys.all });
    },
  });
}

export type { MasterRow };
