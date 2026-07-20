import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import { toCustomerListRow } from './listProjection';
import type {
  CreateCustomerInput,
  CustomerBookingRow,
  CustomerLedgerLine,
  CustomerLedgerReport,
  CustomerReceiptRow,
  ListCustomersQuery,
  PaginatedCustomers,
  PublicCustomer,
  PublicCustomerDocument,
  UpdateCustomerInput,
  VerifyKycInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseCustomer(row: PublicCustomer): PublicCustomer {
  return {
    ...row,
    kycVerifiedAt: toIso(row.kycVerifiedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedCustomers['meta'] {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

/** `GET /customers` — `customer.view` */
export async function fetchCustomers(
  query: ListCustomersQuery = {},
): Promise<PaginatedCustomers> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCustomer[]>('/customers', {
    ...query,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map((row) =>
      toCustomerListRow(normaliseCustomer(row)),
    ),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /customers/:id` — `customer.view` (full Aadhaar when `customer.manage`) */
export async function fetchCustomer(id: string): Promise<PublicCustomer> {
  const res = await apiGet<PublicCustomer>(`/customers/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Customer unavailable');
  }
  return normaliseCustomer(res.data);
}

/** `GET /customers/:id/documents` — `customer.view` */
export async function fetchCustomerDocuments(
  customerId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PublicCustomerDocument[]> {
  const res = await apiGet<PublicCustomerDocument[]>(
    `/customers/${customerId}/documents`,
    {
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    },
  );
  return (res.data ?? []).map(normaliseDocument);
}

/**
 * `POST /customers/:id/documents` — `customer.manage`
 * Multipart: `file` + optional `category`.
 */
export async function uploadCustomerDocument(
  customerId: string,
  file: File,
  category?: string,
): Promise<PublicCustomerDocument> {
  const form = new FormData();
  form.append('file', file);
  if (category) {
    form.append('category', category);
  }
  const { data } = await apiClient.post<ApiResponse<PublicCustomerDocument>>(
    `/customers/${customerId}/documents`,
    form,
    {
      headers: { 'Content-Type': undefined },
    },
  );
  if (!data.data) {
    throw new Error(data.message || 'Document upload failed');
  }
  return normaliseDocument(data.data);
}

function normaliseDocument(row: PublicCustomerDocument): PublicCustomerDocument {
  return {
    ...row,
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
  };
}

/** `POST /customers` — `customer.manage` */
export async function createCustomer(
  input: CreateCustomerInput,
): Promise<PublicCustomer> {
  const res = await apiPost<PublicCustomer>('/customers', input);
  if (!res.data) {
    throw new Error(res.message || 'Customer create failed');
  }
  return normaliseCustomer(res.data);
}

/** `PATCH /customers/:id` — `customer.manage` */
export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<PublicCustomer> {
  const res = await apiPatch<PublicCustomer>(`/customers/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Customer update failed');
  }
  return normaliseCustomer(res.data);
}

/** `POST /customers/:id/verify-kyc` — `customer.manage` */
export async function verifyCustomerKyc(
  id: string,
  input: VerifyKycInput,
): Promise<PublicCustomer> {
  const res = await apiPost<PublicCustomer>(
    `/customers/${id}/verify-kyc`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'KYC update failed');
  }
  return normaliseCustomer(res.data);
}

/** `POST /customers/:id/activate` — `customer.manage` */
export async function activateCustomer(id: string): Promise<PublicCustomer> {
  const res = await apiPost<PublicCustomer>(`/customers/${id}/activate`);
  if (!res.data) {
    throw new Error(res.message || 'Activation failed');
  }
  return normaliseCustomer(res.data);
}

/** `POST /customers/:id/deactivate` — `customer.manage` */
export async function deactivateCustomer(id: string): Promise<PublicCustomer> {
  const res = await apiPost<PublicCustomer>(`/customers/${id}/deactivate`);
  if (!res.data) {
    throw new Error(res.message || 'Deactivation failed');
  }
  return normaliseCustomer(res.data);
}

/** `GET /bookings?customerId=` — `booking.view` */
export async function fetchCustomerBookings(
  customerId: string,
): Promise<CustomerBookingRow[]> {
  const res = await apiGet<
    Array<{
      id: string;
      bookingNumber: string;
      customerId: string;
      projectId: string;
      unitId: string;
      bookingDate: string | Date;
      bookingAmount: number;
      agreedPrice: number;
      status: string;
    }>
  >('/bookings', {
    customerId,
    page: 1,
    limit: 50,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    bookingNumber: row.bookingNumber,
    customerId: row.customerId,
    projectId: row.projectId,
    unitId: row.unitId,
    bookingDate: toIso(row.bookingDate) ?? '',
    bookingAmount: row.bookingAmount,
    agreedPrice: row.agreedPrice,
    status: row.status,
  }));
}

/** `GET /customer-receipts?customerId=` — `collection.view` */
export async function fetchCustomerReceipts(
  customerId: string,
): Promise<CustomerReceiptRow[]> {
  const res = await apiGet<
    Array<{
      id: string;
      receiptNumber: string;
      customerId: string;
      bookingId: string;
      projectId: string;
      receiptDate: string | Date;
      amount: number;
      paymentMode: string;
      status: string;
      allocatedAmount: number;
      unallocatedAmount: number;
    }>
  >('/customer-receipts', {
    customerId,
    page: 1,
    limit: 50,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    customerId: row.customerId,
    bookingId: row.bookingId,
    projectId: row.projectId,
    receiptDate: toIso(row.receiptDate) ?? '',
    amount: row.amount,
    paymentMode: row.paymentMode,
    status: row.status,
    allocatedAmount: row.allocatedAmount,
    unallocatedAmount: row.unallocatedAmount,
  }));
}

/**
 * `GET /accounting-reports/customer-ledger?partyId=` — `report.view`
 */
export async function fetchCustomerLedger(
  customerId: string,
): Promise<CustomerLedgerReport> {
  const res = await apiGet<{
    rows?: CustomerLedgerLine[];
    totals?: { debit?: number; credit?: number };
  }>('/accounting-reports/customer-ledger', {
    partyId: customerId,
  });
  if (!res.data) {
    throw new Error(res.message || 'Customer ledger unavailable');
  }
  const rows = (res.data.rows ?? []).map((row) => ({
    journalId: row.journalId,
    journalNumber: row.journalNumber,
    journalDate: row.journalDate,
    accountCode: row.accountCode,
    accountName: row.accountName,
    narration: row.narration,
    debit: Number(row.debit ?? 0),
    credit: Number(row.credit ?? 0),
    runningBalance: Number(row.runningBalance ?? 0),
    partyName: row.partyName ?? null,
  }));
  return {
    rows,
    totals: {
      debit: Number(res.data.totals?.debit ?? 0),
      credit: Number(res.data.totals?.credit ?? 0),
    },
  };
}
