import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { searchContractors } from '@/api/searchLists';
import {
  acceptWorkOrder,
  approveWorkOrder,
  approveWorkOrderAmendment,
  cancelWorkOrder,
  closeWorkOrder,
  completeWorkOrder,
  createWorkOrder,
  createWorkOrderAmendment,
  fetchWorkOrder,
  fetchWorkOrderAmendments,
  fetchWorkOrders,
  issueWorkOrder,
  partiallyCompleteWorkOrder,
  rejectWorkOrderAmendment,
  startWorkOrder,
  submitWorkOrder,
  updateWorkOrder,
} from './api';
import { workOrdersKeys } from './queryKeys';
import type {
  CreateWorkOrderAmendmentInput,
  CreateWorkOrderInput,
  ListWorkOrdersQuery,
  UpdateWorkOrderInput,
} from './types';

export function useWorkOrdersList(
  query: ListWorkOrdersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: workOrdersKeys.list(query),
    queryFn: () => fetchWorkOrders(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useWorkOrderDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: workOrdersKeys.detail(id ?? ''),
    queryFn: () => fetchWorkOrder(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useWorkOrderAmendments(
  workOrderId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: workOrdersKeys.amendments(workOrderId ?? ''),
    queryFn: () => fetchWorkOrderAmendments(workOrderId!),
    enabled: Boolean(workOrderId) && enabled,
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

function invalidateWorkOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.invalidateQueries({ queryKey: workOrdersKeys.all });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkOrderInput) => createWorkOrder(input),
    onSuccess: () => invalidateWorkOrderQueries(queryClient),
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkOrderInput }) =>
      updateWorkOrder(id, input),
    onSuccess: () => invalidateWorkOrderQueries(queryClient),
  });
}

function useTransition(
  mutationFn: (id: string) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateWorkOrderQueries(queryClient),
  });
}

export const useSubmitWorkOrder = () => useTransition(submitWorkOrder);
export const useApproveWorkOrder = () => useTransition(approveWorkOrder);
export const useIssueWorkOrder = () => useTransition(issueWorkOrder);
export const useAcceptWorkOrder = () => useTransition(acceptWorkOrder);
export const useStartWorkOrder = () => useTransition(startWorkOrder);
export const usePartiallyCompleteWorkOrder = () =>
  useTransition(partiallyCompleteWorkOrder);
export const useCompleteWorkOrder = () => useTransition(completeWorkOrder);
export const useCloseWorkOrder = () => useTransition(closeWorkOrder);

export function useCancelWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelWorkOrder(id, reason),
    onSuccess: () => invalidateWorkOrderQueries(queryClient),
  });
}

export function useCreateWorkOrderAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      input,
    }: {
      workOrderId: string;
      input: CreateWorkOrderAmendmentInput;
    }) => createWorkOrderAmendment(workOrderId, input),
    onSuccess: () => invalidateWorkOrderQueries(queryClient),
  });
}

export function useApproveWorkOrderAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amendmentId: string) =>
      approveWorkOrderAmendment(amendmentId),
    onSuccess: () => invalidateWorkOrderQueries(queryClient),
  });
}

export function useRejectWorkOrderAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      amendmentId,
      reason,
    }: {
      amendmentId: string;
      reason?: string;
    }) => rejectWorkOrderAmendment(amendmentId, reason),
    onSuccess: () => invalidateWorkOrderQueries(queryClient),
  });
}
