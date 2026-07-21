import type { ListManpowerPlansQuery } from './types';

export const manpowerPlanKeys = {
  all: ['manpower-plans'] as const,
  lists: () => [...manpowerPlanKeys.all, 'list'] as const,
  list: (query: ListManpowerPlansQuery) =>
    [...manpowerPlanKeys.lists(), query] as const,
  details: () => [...manpowerPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...manpowerPlanKeys.details(), id] as const,
};
