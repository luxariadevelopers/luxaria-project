import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  closePurchaseRequest,
  createPurchaseRequest,
  fetchBoqItems,
  fetchMaterial,
  fetchMaterialStockBalance,
  fetchMaterials,
  fetchPurchaseRequest,
  fetchPurchaseRequests,
  rejectPurchaseRequest,
  returnPurchaseRequest,
  reviewPurchaseRequest,
  startSourcingPurchaseRequest,
  submitPurchaseRequest,
  updatePurchaseRequest,
} from './api';
import { purchaseRequestsKeys } from './queryKeys';
import type {
  ApprovePurchaseRequestInput,
  CreatePurchaseRequestInput,
  ListPurchaseRequestsQuery,
  RejectPurchaseRequestInput,
  ReturnPurchaseRequestInput,
  ReviewPurchaseRequestInput,
  UpdatePurchaseRequestInput,
} from './types';

export function usePurchaseRequestsList(
  query: ListPurchaseRequestsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseRequestsKeys.list(query),
    queryFn: () => fetchPurchaseRequests(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function usePurchaseRequestDetail(
  requestId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseRequestsKeys.detail(requestId ?? ''),
    queryFn: () => fetchPurchaseRequest(requestId!),
    enabled: Boolean(requestId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useMaterialDetail(
  materialId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseRequestsKeys.material(materialId ?? ''),
    queryFn: () => fetchMaterial(materialId!),
    enabled: Boolean(materialId) && enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useMaterialStockBalance(
  projectId: string | null | undefined,
  materialId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseRequestsKeys.stockBalance(
      projectId ?? '',
      materialId ?? '',
    ),
    queryFn: () =>
      fetchMaterialStockBalance({
        projectId: projectId!,
        materialId: materialId!,
      }),
    enabled: Boolean(projectId) && Boolean(materialId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useSearchMaterials(search: string, enabled = true) {
  return useQuery({
    queryKey: purchaseRequestsKeys.materials(search),
    queryFn: () => fetchMaterials({ search, limit: 40 }),
    enabled,
    staleTime: 20_000,
    retry: false,
  });
}

export function useSearchBoqItems(
  projectId: string | null | undefined,
  search: string,
  enabled = true,
) {
  return useQuery({
    queryKey: purchaseRequestsKeys.boqItems(projectId ?? '', search),
    queryFn: () =>
      fetchBoqItems({ projectId: projectId!, search, limit: 40 }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

function useInvalidateRequests() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: purchaseRequestsKeys.all });
  };
}

export function useCreatePurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (input: CreatePurchaseRequestInput) =>
      createPurchaseRequest(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdatePurchaseRequestInput }) =>
      updatePurchaseRequest(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitPurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => submitPurchaseRequest(id),
    onSuccess: invalidate,
  });
}

export function useReviewPurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReviewPurchaseRequestInput }) =>
      reviewPurchaseRequest(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useApprovePurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input: ApprovePurchaseRequestInput }) =>
      approvePurchaseRequest(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRejectPurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input: RejectPurchaseRequestInput }) =>
      rejectPurchaseRequest(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useReturnPurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReturnPurchaseRequestInput }) =>
      returnPurchaseRequest(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useStartSourcingPurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => startSourcingPurchaseRequest(id),
    onSuccess: invalidate,
  });
}

export function useClosePurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => closePurchaseRequest(id),
    onSuccess: invalidate,
  });
}

export function useCancelPurchaseRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => cancelPurchaseRequest(id),
    onSuccess: invalidate,
  });
}
