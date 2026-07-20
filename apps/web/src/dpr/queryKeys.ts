import type { ListDailyProgressReportsQuery } from './types';

export const dprKeys = {
  all: ['dpr'] as const,
  list: (query: ListDailyProgressReportsQuery) =>
    [...dprKeys.all, 'list', query] as const,
  missingAlerts: (projectId?: string) =>
    [...dprKeys.all, 'missing-alerts', projectId ?? 'all'] as const,
};
