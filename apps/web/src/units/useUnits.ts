import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeUnitStatus,
  createUnit,
  fetchBookingsForUnit,
  fetchUnit,
  fetchUnits,
  updateUnit,
} from './api';
import { unitsKeys } from './queryKeys';
import type {
  ChangeUnitStatusInput,
  CreateUnitInput,
  ListUnitsQuery,
  UpdateUnitInput,
} from './types';

export function useUnitsList(query: ListUnitsQuery, enabled = true) {
  return useQuery({
    queryKey: unitsKeys.list(query),
    queryFn: () => fetchUnits(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useUnitDetail(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: unitsKeys.detail(id ?? ''),
    queryFn: () => fetchUnit(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useUnitBookings(
  unitId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: unitsKeys.bookings(unitId ?? ''),
    queryFn: () => fetchBookingsForUnit(unitId!),
    enabled: Boolean(unitId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateUnits() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: unitsKeys.all });
  };
}

export function useCreateUnit() {
  const invalidate = useInvalidateUnits();
  return useMutation({
    mutationFn: (input: CreateUnitInput) => createUnit(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUnit() {
  const invalidate = useInvalidateUnits();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateUnitInput }) =>
      updateUnit(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useChangeUnitStatus() {
  const invalidate = useInvalidateUnits();
  return useMutation({
    mutationFn: (args: { id: string; input: ChangeUnitStatusInput }) =>
      changeUnitStatus(args.id, args.input),
    onSuccess: invalidate,
  });
}
