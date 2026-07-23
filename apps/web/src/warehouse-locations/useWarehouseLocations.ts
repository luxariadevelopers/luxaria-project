import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createWarehouseLocation,
  fetchWarehouseLocation,
  fetchWarehouseLocations,
  updateWarehouseLocation,
} from './api';
import { warehouseLocationsKeys } from './queryKeys';
import type {
  CreateWarehouseLocationInput,
  ListWarehouseLocationsQuery,
  UpdateWarehouseLocationInput,
} from './types';

export function useWarehouseLocationsList(
  query: ListWarehouseLocationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: warehouseLocationsKeys.list(query),
    queryFn: () => fetchWarehouseLocations(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useWarehouseLocationDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: warehouseLocationsKeys.detail(id ?? ''),
    queryFn: () => fetchWarehouseLocation(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateWarehouseLocations() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: warehouseLocationsKeys.all });
  };
}

export function useCreateWarehouseLocation() {
  const invalidate = useInvalidateWarehouseLocations();
  return useMutation({
    mutationFn: (input: CreateWarehouseLocationInput) =>
      createWarehouseLocation(input),
    onSuccess: invalidate,
  });
}

export function useUpdateWarehouseLocation() {
  const invalidate = useInvalidateWarehouseLocations();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateWarehouseLocationInput }) =>
      updateWarehouseLocation(args.id, args.input),
    onSuccess: invalidate,
  });
}
