import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDirectorDigestPreview,
  fetchDirectorDigestPreviewAll,
  runDirectorDigestJob,
  sendDirectorDigest,
} from './api';
import { directorDigestKeys } from './queryKeys';
import type { PreviewDigestQuery, SendDigestInput } from './types';

export function useDirectorDigestPreview(
  query: PreviewDigestQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: directorDigestKeys.preview(query),
    queryFn: () => fetchDirectorDigestPreview(query),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useDirectorDigestPreviewAll(date?: string, enabled = true) {
  return useQuery({
    queryKey: directorDigestKeys.previewAll(date),
    queryFn: () => fetchDirectorDigestPreviewAll(date),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateDirectorDigest() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: directorDigestKeys.all });
  };
}

export function useSendDirectorDigest() {
  const invalidate = useInvalidateDirectorDigest();
  return useMutation({
    mutationFn: (input: SendDigestInput) => sendDirectorDigest(input),
    onSuccess: invalidate,
  });
}

export function useRunDirectorDigestJob() {
  const invalidate = useInvalidateDirectorDigest();
  return useMutation({
    mutationFn: (input: SendDigestInput) => runDirectorDigestJob(input),
    onSuccess: invalidate,
  });
}
