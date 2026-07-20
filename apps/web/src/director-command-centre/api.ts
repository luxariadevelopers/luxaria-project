import { apiGet } from '@/api/client';
import type {
  CommandCentreQuery,
  DirectorCommandCentreSummary,
  PublicDirectorOption,
  PublicFinancialYearOption,
} from './types';

/**
 * `GET /director-command-centre/summary`
 * Permission: `dashboard.view` (+ project access enforced in the service).
 */
export async function fetchDirectorCommandCentreSummary(
  query: CommandCentreQuery = {},
): Promise<DirectorCommandCentreSummary> {
  const res = await apiGet<DirectorCommandCentreSummary>(
    '/director-command-centre/summary',
    { ...query },
  );
  if (!res.data) {
    throw new Error(res.message || 'Director command centre summary unavailable');
  }
  return res.data;
}

/**
 * `GET /directors` — filter options only.
 * Permission: `director.view`.
 */
export async function fetchDirectorFilterOptions(): Promise<
  PublicDirectorOption[]
> {
  const res = await apiGet<PublicDirectorOption[]>('/directors', {
    status: 'active',
    page: 1,
    limit: 100,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    directorCode: row.directorCode,
    fullName: row.fullName,
    status: row.status,
  }));
}

/**
 * `GET /financial-years` — filter options only.
 * Permission: `financial_year.view`.
 */
export async function fetchFinancialYearFilterOptions(): Promise<
  PublicFinancialYearOption[]
> {
  const res = await apiGet<PublicFinancialYearOption[]>('/financial-years', {
    page: 1,
    limit: 50,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    isCurrent: Boolean(row.isCurrent),
    isLocked: Boolean(row.isLocked),
    status: row.status,
  }));
}
