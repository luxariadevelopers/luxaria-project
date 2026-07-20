import type { ListContributionReceiptsQuery } from './types';

export const contributionReceiptsKeys = {
  all: ['contribution-receipts'] as const,
  list: (projectId: string, query: ListContributionReceiptsQuery) =>
    [...contributionReceiptsKeys.all, 'list', projectId, query] as const,
  balances: (projectId: string, participantId?: string) =>
    [
      ...contributionReceiptsKeys.all,
      'balances',
      projectId,
      participantId ?? 'all',
    ] as const,
  bankAccounts: ['contribution-receipts', 'bank-accounts'] as const,
};
