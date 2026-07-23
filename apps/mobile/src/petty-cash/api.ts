import { apiGet, apiPost } from '@/api/client';
import type { CreatePettyCashInput, PublicPettyCashRequirement } from './types';

const BASE = '/petty-cash-requirements';

function normaliseRequirement(
  row: PublicPettyCashRequirement,
): PublicPettyCashRequirement {
  return {
    ...row,
    requestNumber: row.requestNumber || row.requirementNumber || '',
    previousUnsettledAmount: row.previousUnsettledAmount ?? 0,
    warnings: row.warnings ?? [],
  };
}

export async function listPettyCashRequirements(params: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<PublicPettyCashRequirement[]> {
  const res = await apiGet<PublicPettyCashRequirement[]>(BASE, {
    projectId: params.projectId,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  return (res.data ?? []).map(normaliseRequirement);
}

export async function getPettyCashRequirement(id: string): Promise<PublicPettyCashRequirement> {
  const res = await apiGet<PublicPettyCashRequirement>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'Request not found');
  return normaliseRequirement(res.data);
}

export async function createPettyCashRequirement(
  input: CreatePettyCashInput,
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(BASE, input);
  if (!res.data) throw new Error(res.message || 'Create failed');
  return normaliseRequirement(res.data);
}

export async function submitPettyCashRequirement(id: string): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(`${BASE}/${id}/submit`);
  if (!res.data) throw new Error(res.message || 'Submit failed');
  return normaliseRequirement(res.data);
}
