import type { ListPettyCashFundTransfersQuery } from './types';

export const pettyCashTransfersKeys = {
  all: ['petty-cash-fund-transfers'] as const,
  list: (projectId: string, query: ListPettyCashFundTransfersQuery) =>
    [...pettyCashTransfersKeys.all, 'list', projectId, query] as const,
  detail: (id: string) =>
    [...pettyCashTransfersKeys.all, 'detail', id] as const,
  balance: (requestId: string) =>
    [...pettyCashTransfersKeys.all, 'balance', requestId] as const,
  fundableRequests: (projectId: string) =>
    [...pettyCashTransfersKeys.all, 'fundable-requests', projectId] as const,
  bankAccounts: (projectId: string) =>
    [...pettyCashTransfersKeys.all, 'bank-accounts', projectId] as const,
};
