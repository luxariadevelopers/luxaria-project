import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createDirector,
  fetchActiveShareholding,
  fetchDirector,
  fetchDirectorDocuments,
  fetchDirectors,
  updateDirector,
  uploadDirectorDocument,
} from './api';
import { directorsKeys } from './queryKeys';
import type {
  CreateDirectorInput,
  ListDirectorsQuery,
  UpdateDirectorInput,
} from './types';

export function useDirectorsList(
  query: ListDirectorsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: directorsKeys.list(query),
    queryFn: () => fetchDirectors(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useDirectorDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: directorsKeys.detail(id ?? ''),
    queryFn: () => fetchDirector(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useDirectorDocuments(
  directorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: directorsKeys.documents(directorId ?? ''),
    queryFn: () => fetchDirectorDocuments(directorId!),
    enabled: Boolean(directorId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useActiveShareholding(
  companyId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: directorsKeys.shareholding(companyId),
    queryFn: () => fetchActiveShareholding(companyId),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreateDirector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDirectorInput) => createDirector(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directorsKeys.all });
    },
  });
}

export function useUpdateDirector(directorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDirectorInput) =>
      updateDirector(directorId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directorsKeys.detail(directorId) });
      void qc.invalidateQueries({ queryKey: directorsKeys.all });
    },
  });
}

export function useUploadDirectorDocument(directorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; category?: string }) =>
      uploadDirectorDocument(directorId, args.file, args.category),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: directorsKeys.documents(directorId),
      });
    },
  });
}
