import type { ListPettyCashRequirementsQuery } from './types';

export const pettyCashRequestsKeys = {
  all: ['petty-cash-requirements'] as const,
  list: (query: ListPettyCashRequirementsQuery) =>
    [...pettyCashRequestsKeys.all, 'list', query] as const,
  detail: (id: string) =>
    [...pettyCashRequestsKeys.all, 'detail', id] as const,
  cashAccounts: (projectId: string) =>
    [...pettyCashRequestsKeys.all, 'cash-accounts', projectId] as const,
  cashBalance: (accountId: string) =>
    [...pettyCashRequestsKeys.all, 'cash-balance', accountId] as const,
};
