import { apiGet } from '@/api/client';
import type { CustomerPortalDocument, CustomerPortalProfile } from './types';

/** `GET /customer-portal/me` — `customer_portal.view` */
export async function fetchCustomerPortalMe(): Promise<CustomerPortalProfile> {
  const res = await apiGet<CustomerPortalProfile>('/customer-portal/me');
  if (!res.data) {
    throw new Error(res.message || 'Customer portal profile unavailable');
  }
  return res.data;
}

/** `GET /customer-portal/documents` — `customer_portal.view` */
export async function fetchCustomerPortalDocuments(): Promise<
  CustomerPortalDocument[]
> {
  const res = await apiGet<CustomerPortalDocument[]>('/customer-portal/documents');
  return res.data ?? [];
}
