import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  attachMaterialIssueSignatures,
  cancelMaterialIssue,
  confirmMaterialIssue,
  createMaterialIssue,
  createMaterialReturn,
  fetchAvailableStock,
  fetchBoqItemsForIssue,
  fetchMaterialIssue,
  fetchMaterialIssues,
  fetchMaterialsForIssue,
  fetchUsersForIssue,
  submitMaterialIssue,
  updateMaterialIssue,
} from './api';
import { materialIssuesKeys } from './queryKeys';
import type {
  AttachSignaturesInput,
  CreateMaterialIssueInput,
  CreateMaterialReturnInput,
  ListMaterialIssuesQuery,
  UpdateMaterialIssueInput,
} from './types';

export function useMaterialIssuesList(
  query: ListMaterialIssuesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: materialIssuesKeys.list(query),
    queryFn: () => fetchMaterialIssues(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useMaterialIssueDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: materialIssuesKeys.detail(id ?? ''),
    queryFn: () => fetchMaterialIssue(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useAvailableStock(query: {
  projectId: string | null | undefined;
  materialId: string | null | undefined;
  location?: string;
  enabled?: boolean;
}) {
  const location = query.location ?? '';
  return useQuery({
    queryKey: materialIssuesKeys.stock(
      query.projectId ?? '',
      query.materialId ?? '',
      location,
    ),
    queryFn: () =>
      fetchAvailableStock({
        projectId: query.projectId!,
        materialId: query.materialId!,
        location: location || undefined,
      }),
    enabled:
      Boolean(query.projectId) &&
      Boolean(query.materialId) &&
      (query.enabled ?? true),
    staleTime: 10_000,
    retry: false,
  });
}

export function useMaterialsForIssue(search: string, enabled = true) {
  return useQuery({
    queryKey: materialIssuesKeys.materials(search),
    queryFn: () => fetchMaterialsForIssue({ search: search || undefined }),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useBoqItemsForIssue(
  projectId: string | null | undefined,
  search: string,
  enabled = true,
) {
  return useQuery({
    queryKey: materialIssuesKeys.boqItems(projectId ?? '', search),
    queryFn: () =>
      fetchBoqItemsForIssue({
        projectId: projectId!,
        search: search || undefined,
      }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useUsersForIssue(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: materialIssuesKeys.users(projectId ?? ''),
    queryFn: () => fetchUsersForIssue(projectId ?? undefined),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateMaterialIssues() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: materialIssuesKeys.all });
  };
}

export function useCreateMaterialIssue() {
  const invalidate = useInvalidateMaterialIssues();
  return useMutation({
    mutationFn: (input: CreateMaterialIssueInput) =>
      createMaterialIssue(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMaterialIssue() {
  const invalidate = useInvalidateMaterialIssues();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateMaterialIssueInput }) =>
      updateMaterialIssue(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useAttachSignatures() {
  const invalidate = useInvalidateMaterialIssues();
  return useMutation({
    mutationFn: (args: { id: string; input: AttachSignaturesInput }) =>
      attachMaterialIssueSignatures(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitMaterialIssue() {
  const invalidate = useInvalidateMaterialIssues();
  return useMutation({
    mutationFn: (id: string) => submitMaterialIssue(id),
    onSuccess: invalidate,
  });
}

export function useConfirmMaterialIssue() {
  const invalidate = useInvalidateMaterialIssues();
  return useMutation({
    mutationFn: (id: string) => confirmMaterialIssue(id),
    onSuccess: invalidate,
  });
}

export function useCreateMaterialReturn() {
  const invalidate = useInvalidateMaterialIssues();
  return useMutation({
    mutationFn: (args: { id: string; input: CreateMaterialReturnInput }) =>
      createMaterialReturn(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelMaterialIssue() {
  const invalidate = useInvalidateMaterialIssues();
  return useMutation({
    mutationFn: (id: string) => cancelMaterialIssue(id),
    onSuccess: invalidate,
  });
}
