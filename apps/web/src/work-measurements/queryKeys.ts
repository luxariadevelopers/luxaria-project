import type { ListWorkMeasurementsQuery } from './types';

export const workMeasurementsKeys = {
  all: ['work-measurements'] as const,
  lists: () => [...workMeasurementsKeys.all, 'list'] as const,
  list: (query: ListWorkMeasurementsQuery) =>
    [...workMeasurementsKeys.lists(), query] as const,
  details: () => [...workMeasurementsKeys.all, 'detail'] as const,
  detail: (id: string) => [...workMeasurementsKeys.details(), id] as const,
  boqItems: (projectId: string, search: string) =>
    [...workMeasurementsKeys.all, 'boq-items', projectId, search] as const,
  contractors: (search: string) =>
    [...workMeasurementsKeys.all, 'contractors', search] as const,
  priorQuantity: (
    projectId: string,
    contractorId: string,
    boqItemId: string,
    excludeId?: string,
  ) =>
    [
      ...workMeasurementsKeys.all,
      'prior-qty',
      projectId,
      contractorId,
      boqItemId,
      excludeId ?? '',
    ] as const,
};
