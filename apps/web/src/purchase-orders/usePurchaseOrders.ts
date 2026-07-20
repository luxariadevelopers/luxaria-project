import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrder,
  fetchPurchaseOrder,
  fetchPurchaseOrderBalance,
  fetchPurchaseOrders,
  rejectPurchaseOrder,
  revisePurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from './api';
import { purchaseOrdersKeys } from './queryKeys';
import { filterRevisionChain, rootPurchaseOrderId } from './revisionChain';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  PublicPurchaseOrder,
  UpdatePurchaseOrderInput,
} from './types';

function useInvalidatePurchaseOrders() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: purchaseOrdersKeys.all });
  };
}

export function usePurchaseOrdersList(
  query: ListPurchaseOrdersQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseOrdersKeys.list(query),
    queryFn: () => fetchPurchaseOrders(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function usePurchaseOrderDetail(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseOrdersKeys.detail(id ?? ''),
    queryFn: () => fetchPurchaseOrder(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function usePurchaseOrderBalance(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseOrdersKeys.balance(id ?? ''),
    queryFn: () => fetchPurchaseOrderBalance(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

/**
 * Load revision family for a PO (same purchase request, filtered by root).
 * Nest has no dedicated revisions endpoint — uses list + client filter.
 */
export function usePurchaseOrderRevisions(
  po: PublicPurchaseOrder | null | undefined,
  enabled = true,
) {
  const rootId = po ? rootPurchaseOrderId(po) : '';
  return useQuery({
    queryKey: [...purchaseOrdersKeys.all, 'revisions', rootId] as const,
    queryFn: async () => {
      const page = await fetchPurchaseOrders({
        purchaseRequestId: po!.purchaseRequestId,
        projectId: po!.projectId,
        limit: 100,
      });
      return filterRevisionChain(page.items, rootId);
    },
    enabled: Boolean(po) && Boolean(rootId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useCreatePurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (input: CreatePurchaseOrderInput) => createPurchaseOrder(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdatePurchaseOrderInput }) =>
      updatePurchaseOrder(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitPurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (id: string) => submitPurchaseOrder(id),
    onSuccess: invalidate,
  });
}

export function useApprovePurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input?: { comment?: string | null };
    }) => approvePurchaseOrder(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRejectPurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (args: { id: string; input: { reason: string } }) =>
      rejectPurchaseOrder(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRevisePurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdatePurchaseOrderInput }) =>
      revisePurchaseOrder(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useClosePurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (id: string) => closePurchaseOrder(id),
    onSuccess: invalidate,
  });
}

export function useCancelPurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (id: string) => cancelPurchaseOrder(id),
    onSuccess: invalidate,
  });
}
