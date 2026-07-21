import { apiGet, apiPost } from '@/api/client';

export type StockTransfer = {
  id: string;
  transferNumber: string;
  scope: string;
  sourceProjectId: string;
  destProjectId: string;
  sourceLocation: string;
  destLocation: string;
  status: string;
  transferDate: string;
};

export async function listStockTransfers(
  projectId: string,
): Promise<StockTransfer[]> {
  const res = await apiGet<StockTransfer[]>('/stock-transfers', { projectId });
  return res.data ?? [];
}

export async function postStockTransfer(id: string): Promise<StockTransfer> {
  const res = await apiPost<StockTransfer>(`/stock-transfers/${id}/post`, {});
  if (!res.data) {
    throw new Error(res.message || 'Failed to post transfer');
  }
  return res.data;
}
