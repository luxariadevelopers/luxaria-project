import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { searchContractors } from '@/api/searchLists';
import { fetchBoqItemsForMeasurement } from '@/work-measurements/api';
import {
  acknowledgeMeasurementBookEntry,
  cancelMeasurementBookEntry,
  certifyMeasurementBookEntry,
  createMeasurementBookEntry,
  fetchMeasurementBookEntries,
  rejectMeasurementBookEntry,
  reviseMeasurementBookEntry,
  submitMeasurementBookEntry,
  verifyMeasurementBookEntry,
  type CreateMeasurementBookInput,
  type ListMeasurementBookQuery,
  type ReviseMeasurementBookInput,
} from './api';

export const measurementBookKeys = {
  all: ['measurement-book'] as const,
  list: (query: ListMeasurementBookQuery) =>
    [...measurementBookKeys.all, 'list', query] as const,
};

export function useMeasurementBookList(
  query: ListMeasurementBookQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: measurementBookKeys.list(query),
    queryFn: () => fetchMeasurementBookEntries(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    void qc.invalidateQueries({ queryKey: measurementBookKeys.all });
}

export function useCreateMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateMeasurementBookInput) =>
      createMeasurementBookEntry(input),
    onSuccess: invalidate,
  });
}

export function useSubmitMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => submitMeasurementBookEntry(id),
    onSuccess: invalidate,
  });
}

export function useAcknowledgeMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => acknowledgeMeasurementBookEntry(id),
    onSuccess: invalidate,
  });
}

export function useVerifyMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => verifyMeasurementBookEntry(id),
    onSuccess: invalidate,
  });
}

export function useCertifyMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => certifyMeasurementBookEntry(id),
    onSuccess: invalidate,
  });
}

export function useRejectMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectMeasurementBookEntry(id, reason),
    onSuccess: invalidate,
  });
}

export function useCancelMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelMeasurementBookEntry(id),
    onSuccess: invalidate,
  });
}

export function useReviseMeasurementBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ReviseMeasurementBookInput;
    }) => reviseMeasurementBookEntry(id, input),
    onSuccess: invalidate,
  });
}

export function useMbContractorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: [...measurementBookKeys.all, 'contractors', search],
    queryFn: () => searchContractors({ search, limit: 40 }),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useMbBoqOptions(
  projectId: string | null | undefined,
  search: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...measurementBookKeys.all, 'boq', projectId, search],
    queryFn: () =>
      fetchBoqItemsForMeasurement({
        projectId: projectId!,
        search: search || undefined,
      }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}
