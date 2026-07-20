import type { ListContractorPaymentsQuery } from './types';

export const contractorPaymentsKeys = {
  all: ['contractor-payments'] as const,
  lists: () => [...contractorPaymentsKeys.all, 'list'] as const,
  list: (query: ListContractorPaymentsQuery) =>
    [...contractorPaymentsKeys.lists(), query] as const,
  details: () => [...contractorPaymentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractorPaymentsKeys.details(), id] as const,
  payableBills: (projectId: string, contractorId: string) =>
    [
      ...contractorPaymentsKeys.all,
      'payable-bills',
      projectId,
      contractorId,
    ] as const,
  bankAccounts: (projectId: string) =>
    [...contractorPaymentsKeys.all, 'bank-accounts', projectId] as const,
  contractors: (search: string) =>
    [...contractorPaymentsKeys.all, 'contractors', search] as const,
};
