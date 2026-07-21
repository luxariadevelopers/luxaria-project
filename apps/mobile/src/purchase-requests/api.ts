import { apiGet, apiPost } from '@/api/client';
import type {
  CreatePurchaseRequestInput,
  MaterialOption,
  PublicPurchaseRequest,
} from './types';

const BASE = '/purchase-requests';

export async function listPurchaseRequests(params: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<PublicPurchaseRequest[]> {
  const res = await apiGet<PublicPurchaseRequest[]>(BASE, {
    projectId: params.projectId,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  return res.data ?? [];
}

export async function getPurchaseRequest(id: string): Promise<PublicPurchaseRequest> {
  const res = await apiGet<PublicPurchaseRequest>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'PR not found');
  return res.data;
}

export async function createPurchaseRequest(
  input: CreatePurchaseRequestInput,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(BASE, input);
  if (!res.data) throw new Error(res.message || 'Create failed');
  return res.data;
}

export async function submitPurchaseRequest(id: string): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(`${BASE}/${id}/submit`);
  if (!res.data) throw new Error(res.message || 'Submit failed');
  return res.data;
}

export async function listMaterials(params?: { search?: string }): Promise<MaterialOption[]> {
  const res = await apiGet<Array<Record<string, unknown>>>('/materials', {
    page: 1,
    limit: 50,
    search: params?.search,
  });
  return (res.data ?? []).map((row) => ({
    id: String(row.id),
    materialCode: String(row.materialCode ?? row.code ?? ''),
    materialName: String(row.materialName ?? row.name ?? ''),
    baseUnit: row.baseUnit ? String(row.baseUnit) : row.unit ? String(row.unit) : undefined,
  }));
}
