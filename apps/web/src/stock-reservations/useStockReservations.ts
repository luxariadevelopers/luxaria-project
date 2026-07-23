import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelStockReservation,
  createStockReservation,
  fetchAvailableStock,
  fetchStockReservation,
  fetchStockReservations,
  releaseStockReservation,
} from './api';
import { stockReservationsKeys } from './queryKeys';
import type {
  CreateStockReservationInput,
  ListStockReservationsQuery,
  ReleaseStockReservationInput,
} from './types';

export function useStockReservationsList(
  query: ListStockReservationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: stockReservationsKeys.list(query),
    queryFn: () => fetchStockReservations(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useStockReservationDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: stockReservationsKeys.detail(id ?? ''),
    queryFn: () => fetchStockReservation(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useAvailableStock(
  query: {
    projectId: string;
    materialId: string;
    location?: string;
  } | null,
  enabled = true,
) {
  return useQuery({
    queryKey: stockReservationsKeys.available(
      query ?? { projectId: '', materialId: '' },
    ),
    queryFn: () => fetchAvailableStock(query!),
    enabled: Boolean(query?.projectId && query.materialId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateStockReservations() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: stockReservationsKeys.all });
  };
}

export function useCreateStockReservation() {
  const invalidate = useInvalidateStockReservations();
  return useMutation({
    mutationFn: (input: CreateStockReservationInput) =>
      createStockReservation(input),
    onSuccess: invalidate,
  });
}

export function useReleaseStockReservation() {
  const invalidate = useInvalidateStockReservations();
  return useMutation({
    mutationFn: (args: { id: string; input?: ReleaseStockReservationInput }) =>
      releaseStockReservation(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelStockReservation() {
  const invalidate = useInvalidateStockReservations();
  return useMutation({
    mutationFn: (id: string) => cancelStockReservation(id),
    onSuccess: invalidate,
  });
}
