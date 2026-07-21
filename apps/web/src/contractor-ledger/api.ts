import { apiGet } from '@/api/client';
import type { AccountingReportPayload } from '@/reports/accounting/types';

export type ContractorLedgerQuery = {
  financialYearId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  partyId?: string;
};

/**
 * Prefers thin Nest wrapper `GET /contractor-ledger`.
 * Falls back to `GET /accounting-reports/contractor-ledger` if wrapper is not wired.
 */
export async function fetchContractorLedger(
  query: ContractorLedgerQuery = {},
): Promise<AccountingReportPayload> {
  const params = {
    financialYearId: query.financialYearId || undefined,
    projectId: query.projectId || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
    partyId: query.partyId || undefined,
  };

  try {
    const res = await apiGet<AccountingReportPayload>(
      '/contractor-ledger',
      params,
    );
    if (res.data) return res.data;
  } catch {
    // Wrapper module may not be registered yet — use accounting-reports.
  }

  const res = await apiGet<AccountingReportPayload>(
    '/accounting-reports/contractor-ledger',
    params,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor ledger unavailable');
  }
  return res.data;
}
