import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approveParticipant,
  createParticipant,
  createParticipantVersion,
  fetchActiveParticipants,
  fetchParticipantConfiguration,
  fetchParticipantHistory,
  rejectParticipant,
  submitParticipant,
  updateParticipant,
  type ParticipantHistoryQuery,
} from './api';
import { projectParticipantsKeys } from './queryKeys';
import type {
  CreateParticipantInput,
  CreateParticipantVersionInput,
  UpdateParticipantInput,
} from './types';

export function useActiveParticipants(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: projectParticipantsKeys.active(projectId ?? ''),
    queryFn: () => fetchActiveParticipants(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useParticipantConfiguration(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: projectParticipantsKeys.configuration(projectId ?? ''),
    queryFn: () => fetchParticipantConfiguration(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useParticipantHistory(
  projectId: string | undefined,
  query: ParticipantHistoryQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: projectParticipantsKeys.history(projectId ?? '', query),
    queryFn: () => fetchParticipantHistory(projectId!, query),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function invalidateProject(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  void qc.invalidateQueries({
    queryKey: projectParticipantsKeys.project(projectId),
  });
}

export function useCreateParticipant(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParticipantInput) =>
      createParticipant(projectId, input),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useUpdateParticipant(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { recordId: string; input: UpdateParticipantInput }) =>
      updateParticipant(projectId, args.recordId, args.input),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useCreateParticipantVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      recordId: string;
      input: CreateParticipantVersionInput;
    }) => createParticipantVersion(projectId, args.recordId, args.input),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useSubmitParticipant(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => submitParticipant(projectId, recordId),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useApproveParticipant(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => approveParticipant(projectId, recordId),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useRejectParticipant(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { recordId: string; rejectionReason: string }) =>
      rejectParticipant(projectId, args.recordId, args.rejectionReason),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}
