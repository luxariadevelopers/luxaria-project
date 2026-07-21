import { apiPost } from '@/api/client';

export type PublicGoodsReceipt = {
  id: string;
  grnNumber?: string;
  status: string;
};

/** `POST /goods-receipts/:id/post` — `grn.approve` */
export async function postGoodsReceipt(
  id: string,
): Promise<PublicGoodsReceipt> {
  const res = await apiPost<PublicGoodsReceipt>(
    `/goods-receipts/${encodeURIComponent(id)}/post`,
  );
  if (!res.data) throw new Error(res.message || 'Post GRN failed');
  return res.data;
}
