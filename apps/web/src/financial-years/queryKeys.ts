import type {
  FinancialYearListQuery,
  UnlockRequestListQuery,
} from './types';

export const financialYearKeys = {
  all: ['financial-years'] as const,
  lists: () => [...financialYearKeys.all, 'list'] as const,
  list: (query: FinancialYearListQuery) =>
    [...financialYearKeys.lists(), query] as const,
  details: () => [...financialYearKeys.all, 'detail'] as const,
  detail: (financialYearId: string) =>
    [...financialYearKeys.details(), financialYearId] as const,
  current: (companyId?: string | null) =>
    [...financialYearKeys.all, 'current', companyId ?? 'primary'] as const,
  unlockRequests: (
    financialYearId: string,
    query: UnlockRequestListQuery,
  ) =>
    [
      ...financialYearKeys.detail(financialYearId),
      'unlock-requests',
      query,
    ] as const,
  company: (companyId?: string | null) =>
    [...financialYearKeys.all, 'company', companyId ?? 'primary'] as const,
};
