import { apiPost } from '@/api/client';

export type ScanBarcodeResult = {
  action: string;
  payload: string;
  materialCode: string;
  batch: string | null;
  material: {
    id: string;
    materialCode: string;
    name: string;
    baseUnit: string;
    barcode: string | null;
  };
  balance: { onHandBaseQty: number; projectId: string | null } | null;
  suggestedNext: string[];
};

export async function scanInventoryBarcode(input: {
  payload: string;
  projectId?: string;
  action?: 'receive' | 'issue' | 'transfer' | 'count' | 'lookup';
}): Promise<ScanBarcodeResult> {
  const res = await apiPost<ScanBarcodeResult>('/inventory-barcode/scan', input);
  if (!res.data) {
    throw new Error(res.message || 'Barcode scan failed');
  }
  return res.data;
}

export async function generateInventoryBarcode(input: {
  materialId: string;
  projectId?: string;
  batch?: string | null;
}) {
  const res = await apiPost<{
    materialId: string;
    materialCode: string;
    barcode: string;
    payload: string;
    qrText: string;
  }>('/inventory-barcode/generate', input);
  if (!res.data) {
    throw new Error(res.message || 'Barcode generate failed');
  }
  return res.data;
}
