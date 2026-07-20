import type { ListCommitmentsQuery } from './types';

export const commitmentsKeys = {
  all: ['commitments'] as const,
  list: (projectId: string, query: ListCommitmentsQuery) =>
    [...commitmentsKeys.all, 'list', projectId, query] as const,
  summary: (projectId: string, participantId?: string) =>
    [
      ...commitmentsKeys.all,
      'summary',
      projectId,
      participantId ?? 'all',
    ] as const,
  detail: (projectId: string, id: string) =>
    [...commitmentsKeys.all, 'detail', projectId, id] as const,
  history: (projectId: string, commitmentNumber: string) =>
    [...commitmentsKeys.all, 'history', projectId, commitmentNumber] as const,
};
