import { apiGet } from '@/api/client';
import type { SourceUtilisationReport } from './types';

type AccountingReportEnvelope = {
  meta?: {
    reconciliationNotes?: string[];
  };
  sections?: {
    sources?: Array<{
      label: string;
      amount: number;
      accountCategory?: string | null;
    }>;
    utilisation?: Array<{
      label: string;
      amount: number;
      accountCategory?: string | null;
    }>;
  };
  totals?: {
    sources?: number;
    utilisation?: number;
    surplusDeficit?: number;
  };
};

/**
 * `GET /accounting-reports/source-and-utilisation-of-funds`
 * — `report.view`
 */
export async function fetchSourceAndUtilisation(query: {
  projectId: string;
  from: string;
  to: string;
}): Promise<SourceUtilisationReport> {
  const res = await apiGet<AccountingReportEnvelope>(
    '/accounting-reports/source-and-utilisation-of-funds',
    {
      projectId: query.projectId,
      from: query.from,
      to: query.to,
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Source and utilisation report unavailable');
  }
  const sections = res.data.sections ?? {};
  const totals = res.data.totals ?? {};
  return {
    sources: (sections.sources ?? []).map((row) => ({
      label: row.label,
      amount: row.amount,
      accountCategory: row.accountCategory ?? null,
    })),
    utilisation: (sections.utilisation ?? []).map((row) => ({
      label: row.label,
      amount: row.amount,
      accountCategory: row.accountCategory ?? null,
    })),
    totals: {
      sources: Number(totals.sources ?? 0),
      utilisation: Number(totals.utilisation ?? 0),
      surplusDeficit: Number(totals.surplusDeficit ?? 0),
    },
    notes: res.data.meta?.reconciliationNotes ?? [],
  };
}
