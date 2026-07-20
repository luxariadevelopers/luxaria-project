import type { ListContractorBillsQuery } from './types';

export const runningBillsKeys = {
  all: ['running-bills'] as const,
  lists: () => [...runningBillsKeys.all, 'list'] as const,
  list: (query: ListContractorBillsQuery) =>
    [...runningBillsKeys.lists(), query] as const,
  details: () => [...runningBillsKeys.all, 'detail'] as const,
  detail: (id: string) => [...runningBillsKeys.details(), id] as const,
  eligibleMeasurements: (
    projectId: string,
    contractorId: string,
    from: string,
    to: string,
  ) =>
    [
      ...runningBillsKeys.all,
      'eligible-measurements',
      projectId,
      contractorId,
      from,
      to,
    ] as const,
  agreements: (projectId: string, contractorId: string) =>
    [
      ...runningBillsKeys.all,
      'agreements',
      projectId,
      contractorId,
    ] as const,
  contractors: (search: string) =>
    [...runningBillsKeys.all, 'contractors', search] as const,
};
