import { apiGet } from './client';

export type PurchaseOrderLine = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: string;
  receivedQuantity: number;
  balanceQuantity: number;
};

export type PurchaseOrder = {
  id: string;
  purchaseOrderNumber: string;
  projectId: string;
  vendorId: string;
  status: string;
  items: PurchaseOrderLine[];
};

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const response = await apiGet<PurchaseOrder>(`/purchase-orders/${id}`);
  if (!response.data) {
    throw new Error(response.message || 'Purchase order not found');
  }
  return response.data;
}

export async function listPurchaseOrders(params?: {
  projectId?: string;
  status?: string;
}): Promise<PurchaseOrder[]> {
  const response = await apiGet<PurchaseOrder[]>('/purchase-orders', params);
  return response.data ?? [];
}
