import { apiGet, apiPatch } from '@/api/client';
import type { PartyOption } from './types';

export type PublicProject = {
  id: string;
  projectCode: string;
  projectName: string;
  approvedBudget: number | null;
  equalDirectorInvestment: boolean;
};

export async function fetchProject(id: string): Promise<PublicProject> {
  const res = await apiGet<PublicProject>(`/projects/${encodeURIComponent(id)}`);
  if (!res.data) {
    throw new Error(res.message || 'Project not found');
  }
  return {
    ...res.data,
    approvedBudget: res.data.approvedBudget ?? null,
    equalDirectorInvestment: Boolean(res.data.equalDirectorInvestment),
  };
}

export async function updateProject(
  id: string,
  input: {
    approvedBudget?: number | null;
    equalDirectorInvestment?: boolean;
  },
): Promise<PublicProject> {
  const res = await apiPatch<PublicProject>(
    `/projects/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Project update failed');
  }
  return res.data;
}

export async function fetchDirectorOptions(): Promise<PartyOption[]> {
  const res = await apiGet<
    Array<{ id: string; directorCode?: string; fullName?: string }>
  >('/directors', { page: 1, limit: 100, status: 'active' });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    label: `${row.directorCode ?? row.id} — ${row.fullName ?? 'Director'}`,
  }));
}

export async function fetchInvestorOptions(): Promise<PartyOption[]> {
  const res = await apiGet<
    Array<{
      id: string;
      investorCode?: string;
      fullName?: string | null;
      displayName?: string | null;
    }>
  >('/investors', { page: 1, limit: 100, status: 'active' });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    label: `${row.investorCode ?? row.id} — ${row.fullName ?? row.displayName ?? 'Investor'}`,
  }));
}
