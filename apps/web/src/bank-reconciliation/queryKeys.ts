import type { ListSessionsQuery } from './types';

export const bankReconciliationKeys = {
  all: ['bank-reconciliation'] as const,
  sessions: (query: ListSessionsQuery = {}) =>
    [...bankReconciliationKeys.all, 'sessions', query] as const,
  session: (id: string) =>
    [...bankReconciliationKeys.all, 'session', id] as const,
  lines: (id: string, status?: string) =>
    [...bankReconciliationKeys.all, 'lines', id, status ?? 'all'] as const,
  unmatched: (id: string) =>
    [...bankReconciliationKeys.all, 'unmatched', id] as const,
  matches: (id: string) =>
    [...bankReconciliationKeys.all, 'matches', id] as const,
  statement: (id: string) =>
    [...bankReconciliationKeys.all, 'statement', id] as const,
};
