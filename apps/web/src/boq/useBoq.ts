import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateBoqVersion,
  approveBoqVersion,
  compareBoqVersions,
  createBoqItem,
  createBoqVersion,
  downloadBoqImportTemplate,
  fetchActiveBoqVersion,
  fetchBoqHierarchy,
  fetchBoqItem,
  fetchBoqVersion,
  fetchBoqVersions,
  importBoqExcel,
  rejectBoqVersion,
  submitBoqVersion,
  updateBoqItem,
  validateBoqTotals,
} from './api';
import { boqKeys } from './queryKeys';
import type {
  ActivateBoqVersionInput,
  ApproveBoqVersionInput,
  CreateBoqItemInput,
  CreateBoqVersionInput,
  RejectBoqVersionInput,
  UpdateBoqItemInput,
} from './types';

export function useBoqHierarchy(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: boqKeys.hierarchy(projectId ?? ''),
    queryFn: () => fetchBoqHierarchy(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBoqTotals(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: boqKeys.totals(projectId ?? ''),
    queryFn: () => validateBoqTotals(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBoqItemDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: boqKeys.item(id ?? ''),
    queryFn: () => fetchBoqItem(id!),
    enabled: Boolean(id) && id !== 'new' && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useBoqVersions(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: boqKeys.versions(projectId ?? ''),
    queryFn: () => fetchBoqVersions(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useActiveBoqVersion(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: boqKeys.activeVersion(projectId ?? ''),
    queryFn: () => fetchActiveBoqVersion(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBoqVersionDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: boqKeys.version(id ?? ''),
    queryFn: () => fetchBoqVersion(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useBoqVersionCompare(
  projectId: string | null | undefined,
  fromVersionId: string | undefined,
  toVersionId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: boqKeys.compare(
      projectId ?? '',
      fromVersionId ?? '',
      toVersionId ?? '',
    ),
    queryFn: () =>
      compareBoqVersions(projectId!, fromVersionId!, toVersionId!),
    enabled:
      Boolean(projectId) &&
      Boolean(fromVersionId) &&
      Boolean(toVersionId) &&
      fromVersionId !== toVersionId &&
      enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useDownloadBoqTemplate() {
  return useMutation({
    mutationFn: () => downloadBoqImportTemplate(),
  });
}

export function useImportBoqExcel(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      if (!projectId) throw new Error('Project required');
      return importBoqExcel(projectId, file);
    },
    onSuccess: () => {
      if (!projectId) return;
      void qc.invalidateQueries({ queryKey: boqKeys.all });
    },
  });
}

export function useCreateBoqItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBoqItemInput) =>
      createBoqItem(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: boqKeys.all });
    },
  });
}

export function useUpdateBoqItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateBoqItemInput;
    }) => updateBoqItem(id, input),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: boqKeys.all });
      void qc.setQueryData(boqKeys.item(data.id), data);
    },
  });
}

export function useCreateBoqVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBoqVersionInput) =>
      createBoqVersion(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: boqKeys.versions(projectId) });
      void qc.invalidateQueries({
        queryKey: boqKeys.activeVersion(projectId),
      });
    },
  });
}

export function useSubmitBoqVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitBoqVersion(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: boqKeys.versions(projectId) });
    },
  });
}

export function useActivateBoqVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: ActivateBoqVersionInput;
    }) => activateBoqVersion(id, input ?? {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: boqKeys.versions(projectId) });
      void qc.invalidateQueries({
        queryKey: boqKeys.activeVersion(projectId),
      });
    },
  });
}

export function useApproveBoqVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ApproveBoqVersionInput;
    }) => approveBoqVersion(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: boqKeys.versions(projectId) });
      void qc.invalidateQueries({
        queryKey: boqKeys.activeVersion(projectId),
      });
    },
  });
}

export function useRejectBoqVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RejectBoqVersionInput;
    }) => rejectBoqVersion(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: boqKeys.versions(projectId) });
    },
  });
}
