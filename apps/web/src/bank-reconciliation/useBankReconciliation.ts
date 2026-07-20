import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  autoMatchSession,
  completeReconciliationSession,
  createReconciliationSession,
  fetchMatches,
  fetchReconciliationSession,
  fetchReconciliationSessions,
  fetchReconciliationStatement,
  fetchStatementLines,
  fetchUnmatched,
  importBankStatement,
  manualMatchSession,
  postReconciliationAdjustment,
  unmatchSessionMatch,
  updateColumnMapping,
} from './api';
import { bankReconciliationKeys } from './queryKeys';
import type {
  AutoMatchInput,
  BankStatementLineStatus,
  CreateReconciliationSessionInput,
  ImportStatementInput,
  ListSessionsQuery,
  ManualMatchInput,
  PostAdjustmentInput,
  StatementColumnMapping,
} from './types';

export function useReconciliationSessions(
  query: ListSessionsQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: bankReconciliationKeys.sessions(query),
    queryFn: () => fetchReconciliationSessions(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useReconciliationSession(
  sessionId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: bankReconciliationKeys.session(sessionId ?? ''),
    queryFn: () => fetchReconciliationSession(sessionId!),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useStatementLines(
  sessionId: string | null | undefined,
  status?: BankStatementLineStatus,
  enabled = true,
) {
  return useQuery({
    queryKey: bankReconciliationKeys.lines(sessionId ?? '', status),
    queryFn: () => fetchStatementLines(sessionId!, status),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useUnmatched(sessionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: bankReconciliationKeys.unmatched(sessionId ?? ''),
    queryFn: () => fetchUnmatched(sessionId!),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useMatches(sessionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: bankReconciliationKeys.matches(sessionId ?? ''),
    queryFn: () => fetchMatches(sessionId!),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useReconciliationStatement(
  sessionId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: bankReconciliationKeys.statement(sessionId ?? ''),
    queryFn: () => fetchReconciliationStatement(sessionId!),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateSession(sessionId?: string | null) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: bankReconciliationKeys.all });
    if (sessionId) {
      void qc.invalidateQueries({
        queryKey: bankReconciliationKeys.session(sessionId),
      });
    }
  };
}

export function useCreateReconciliationSession() {
  const invalidate = useInvalidateSession();
  return useMutation({
    mutationFn: (input: CreateReconciliationSessionInput) =>
      createReconciliationSession(input),
    onSuccess: invalidate,
  });
}

export function useImportBankStatement(sessionId: string) {
  const invalidate = useInvalidateSession(sessionId);
  return useMutation({
    mutationFn: (input: ImportStatementInput) =>
      importBankStatement(sessionId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateColumnMapping(sessionId: string) {
  const invalidate = useInvalidateSession(sessionId);
  return useMutation({
    mutationFn: (columnMapping: StatementColumnMapping) =>
      updateColumnMapping(sessionId, columnMapping),
    onSuccess: invalidate,
  });
}

export function useAutoMatch(sessionId: string) {
  const invalidate = useInvalidateSession(sessionId);
  return useMutation({
    mutationFn: (input: AutoMatchInput = {}) =>
      autoMatchSession(sessionId, input),
    onSuccess: invalidate,
  });
}

export function useManualMatch(sessionId: string) {
  const invalidate = useInvalidateSession(sessionId);
  return useMutation({
    mutationFn: (input: ManualMatchInput) =>
      manualMatchSession(sessionId, input),
    onSuccess: invalidate,
  });
}

export function useUnmatch(sessionId: string) {
  const invalidate = useInvalidateSession(sessionId);
  return useMutation({
    mutationFn: (matchId: string) => unmatchSessionMatch(sessionId, matchId),
    onSuccess: invalidate,
  });
}

export function useCompleteSession(sessionId: string) {
  const invalidate = useInvalidateSession(sessionId);
  return useMutation({
    mutationFn: () => completeReconciliationSession(sessionId),
    onSuccess: invalidate,
  });
}

export function usePostAdjustment(sessionId: string) {
  const invalidate = useInvalidateSession(sessionId);
  return useMutation({
    mutationFn: (input: PostAdjustmentInput) =>
      postReconciliationAdjustment(sessionId, input),
    onSuccess: invalidate,
  });
}
