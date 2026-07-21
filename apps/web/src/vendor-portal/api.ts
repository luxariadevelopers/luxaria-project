import { apiGet, apiPost } from '@/api/client';

export type VendorPortalRfq = {
  id: string;
  rfqNumber: string;
  title: string;
  status: string;
  projectId: string;
  closingDate: string;
  vendorIds: string[];
};

export type VendorPortalPurchaseOrder = {
  id: string;
  purchaseOrderNumber: string;
  projectId: string;
  status: string;
  total?: number;
  vendorAcceptedAt?: string | null;
};

const BASE = '/vendor-portal';

function toIso(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** `GET /vendor-portal/rfqs` — `vendor_portal.view` */
export async function fetchVendorPortalRfqs(): Promise<VendorPortalRfq[]> {
  const res = await apiGet<VendorPortalRfq[]>(`${BASE}/rfqs`);
  return (res.data ?? []).map((row) => ({
    ...row,
    closingDate: toIso(row.closingDate),
    vendorIds: row.vendorIds ?? [],
  }));
}

/** `GET /vendor-portal/purchase-orders` — `vendor_portal.view` */
export async function fetchVendorPortalPurchaseOrders(): Promise<
  VendorPortalPurchaseOrder[]
> {
  const res = await apiGet<VendorPortalPurchaseOrder[]>(
    `${BASE}/purchase-orders`,
  );
  return (res.data ?? []).map((row) => ({
    ...row,
    vendorAcceptedAt: row.vendorAcceptedAt
      ? toIso(row.vendorAcceptedAt)
      : null,
  }));
}

/** `POST /vendor-portal/purchase-orders/:id/accept` — `vendor_portal.respond` */
export async function acceptVendorPortalPurchaseOrder(
  id: string,
): Promise<VendorPortalPurchaseOrder> {
  const res = await apiPost<VendorPortalPurchaseOrder>(
    `${BASE}/purchase-orders/${encodeURIComponent(id)}/accept`,
  );
  if (!res.data) throw new Error(res.message || 'Accept PO failed');
  return res.data;
}
