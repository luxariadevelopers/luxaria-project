import type { ListContractorAgreementsQuery, ListExpiryAlertsQuery } from './types';

export const contractorAgreementsKeys = {
  all: ['contractor-agreements'] as const,
  list: (query: ListContractorAgreementsQuery) =>
    [...contractorAgreementsKeys.all, 'list', query] as const,
  detail: (id: string) =>
    [...contractorAgreementsKeys.all, 'detail', id] as const,
  versions: (agreementNumber: string, projectId?: string) =>
    [
      ...contractorAgreementsKeys.all,
      'versions',
      agreementNumber,
      projectId ?? '',
    ] as const,
  expiryAlerts: (query: ListExpiryAlertsQuery) =>
    [...contractorAgreementsKeys.all, 'expiry-alerts', query] as const,
};
