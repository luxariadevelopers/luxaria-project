import { apiGet, apiPost } from '@/api/client';

export type PublicQualityInspection = {
  id: string;
  inspectionNumber?: string;
  projectId: string;
  status: string;
  goodsReceiptId?: string | null;
  vendorId?: string | null;
};

export async function listQualityInspections(params: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<PublicQualityInspection[]> {
  const res = await apiGet<PublicQualityInspection[]>('/quality-inspections', {
    projectId: params.projectId,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  return res.data ?? [];
}

export async function getQualityInspection(id: string): Promise<PublicQualityInspection> {
  const res = await apiGet<PublicQualityInspection>(`/quality-inspections/${id}`);
  if (!res.data) throw new Error(res.message || 'Inspection not found');
  return res.data;
}

export async function completeQualityInspection(id: string): Promise<PublicQualityInspection> {
  const res = await apiPost<PublicQualityInspection>(`/quality-inspections/${id}/complete`, {});
  if (!res.data) throw new Error(res.message || 'Complete failed');
  return res.data;
}
