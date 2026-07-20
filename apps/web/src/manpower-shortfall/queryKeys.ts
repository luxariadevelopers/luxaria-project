import type { ListShortfallAlertsQuery } from './types';

export const manpowerShortfallKeys = {
  all: ['manpower-shortfall'] as const,
  lists: () => [...manpowerShortfallKeys.all, 'list'] as const,
  list: (query: ListShortfallAlertsQuery) =>
    [...manpowerShortfallKeys.lists(), query] as const,
  compare: (projectId: string, contractorId: string, asOfDate: string) =>
    [
      ...manpowerShortfallKeys.all,
      'compare',
      projectId,
      contractorId,
      asOfDate,
    ] as const,
};
