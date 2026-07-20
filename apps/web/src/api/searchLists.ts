import type { ApiResponse, PaginatedResponse } from '@luxaria/shared-types';
import { apiClient } from './client';

/** Minimal list-row shapes from backend public mappers (search fields only). */

export type SearchProjectRow = {
  id: string;
  projectCode: string;
  projectName: string;
  status: string;
};

export type SearchVendorRow = {
  id: string;
  vendorCode: string;
  legalName: string;
  status: string;
};

export type SearchContractorRow = {
  id: string;
  contractorCode: string;
  legalName: string;
  status: string;
};

export type SearchCustomerRow = {
  id: string;
  customerCode: string;
  fullName: string;
  status: string;
};

export type SearchPurchaseOrderRow = {
  id: string;
  purchaseOrderNumber: string;
  projectId: string;
  status: string;
};

export type SearchPurchaseRequestRow = {
  id: string;
  requestNumber: string;
  projectId: string;
  status: string;
};

export type SearchBookingRow = {
  id: string;
  bookingNumber: string;
  projectId: string;
  status: string;
};

type ListParams = {
  search: string;
  limit?: number;
  projectId?: string;
};

async function listSearch<T>(
  path: string,
  params: ListParams,
): Promise<T[]> {
  const { data } = await apiClient.get<
    PaginatedResponse<T> | ApiResponse<T[]>
  >(path, {
    params: {
      search: params.search,
      page: 1,
      limit: params.limit ?? 5,
      projectId: params.projectId,
    },
  });
  return data.data ?? [];
}

/** `GET /projects?search=` — `project.view` (access-scoped). */
export function searchProjects(params: ListParams) {
  return listSearch<SearchProjectRow>('/projects', params);
}

/** `GET /vendors?search=` — `vendor.view`. */
export function searchVendors(params: ListParams) {
  return listSearch<SearchVendorRow>('/vendors', params);
}

/** `GET /contractors?search=` — `contractor.view`. */
export function searchContractors(params: ListParams) {
  return listSearch<SearchContractorRow>('/contractors', params);
}

/** `GET /customers?search=` — `customer.view`. */
export function searchCustomers(params: Omit<ListParams, 'projectId'>) {
  return listSearch<SearchCustomerRow>('/customers', params);
}

/** `GET /purchase-orders?search=` — `purchase.view` (matches PO number). */
export function searchPurchaseOrders(params: ListParams) {
  return listSearch<SearchPurchaseOrderRow>('/purchase-orders', params);
}

/** `GET /purchase-requests?search=` — `purchase.view` (matches request number). */
export function searchPurchaseRequests(params: ListParams) {
  return listSearch<SearchPurchaseRequestRow>('/purchase-requests', params);
}

/** `GET /bookings?search=` — `booking.view` (matches booking number). */
export function searchBookings(params: ListParams) {
  return listSearch<SearchBookingRow>('/bookings', params);
}
