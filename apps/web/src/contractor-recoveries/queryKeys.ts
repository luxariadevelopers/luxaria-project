import type { ListContractorRecoveriesQuery } from './api';

export const contractorRecoveriesKeys = {
  all: ['contractor-recoveries'] as const,
  lists: () => [...contractorRecoveriesKeys.all, 'list'] as const,
  list: (query: ListContractorRecoveriesQuery) =>
    [...contractorRecoveriesKeys.lists(), query] as const,
  details: () => [...contractorRecoveriesKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractorRecoveriesKeys.details(), id] as const,
};
