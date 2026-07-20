import { VendorInvoiceStatus } from '@luxaria/shared-types';
import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  BankAccountOption,
  CreateVendorPaymentInput,
  ListVendorPaymentsQuery,
  PaginatedVendorPayments,
  PayableInvoiceOption,
  PublicVendorPayment,
  UpdateVendorPaymentInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  const iso = toIso(value);
  if (!iso) return '';
  return iso.slice(0, 10);
}

function normalisePayment(row: PublicVendorPayment): PublicVendorPayment {
  return {
    ...row,
    paymentDate: toDateOnly(row.paymentDate) || row.paymentDate,
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    releasedAt: toIso(row.releasedAt),
    verifiedAt: toIso(row.verifiedAt),
    postedAt: toIso(row.postedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    allocations: (row.allocations ?? []).map((a) => ({ ...a })),
    invoiceIds: row.invoiceIds ?? [],
    tds: Number(row.tds ?? 0),
    retention: Number(row.retention ?? 0),
    deductions: Number(row.deductions ?? 0),
    bankAmount: Number(row.bankAmount ?? 0),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedVendorPayments['meta'] {
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

/** `GET /vendor-payments` — Nest `payment.view` */
export async function fetchVendorPayments(
  query: ListVendorPaymentsQuery = {},
): Promise<PaginatedVendorPayments> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicVendorPayment[]>('/vendor-payments', {
    page,
    limit,
    search: query.search,
    projectId: query.projectId,
    vendorId: query.vendorId,
    status: query.status,
    invoiceId: query.invoiceId,
  });
  return {
    items: (res.data ?? []).map(normalisePayment),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /vendor-payments/:id` — Nest `payment.view` */
export async function fetchVendorPayment(
  id: string,
): Promise<PublicVendorPayment> {
  const res = await apiGet<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment unavailable');
  }
  return normalisePayment(res.data);
}

/** `POST /vendor-payments` — Nest `payment.release` */
export async function createVendorPayment(
  input: CreateVendorPaymentInput,
): Promise<PublicVendorPayment> {
  const res = await apiPost<PublicVendorPayment>('/vendor-payments', input);
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment create failed');
  }
  return normalisePayment(res.data);
}

/** `PATCH /vendor-payments/:id` — Nest `payment.release` */
export async function updateVendorPayment(
  id: string,
  input: UpdateVendorPaymentInput,
): Promise<PublicVendorPayment> {
  const res = await apiPatch<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment update failed');
  }
  return normalisePayment(res.data);
}

/** `POST /vendor-payments/:id/submit` — Nest `payment.release` */
export async function submitVendorPayment(
  id: string,
): Promise<PublicVendorPayment> {
  const res = await apiPost<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment submit failed');
  }
  return normalisePayment(res.data);
}

/** `POST /vendor-payments/:id/approve` — Nest `payment.approve` */
export async function approveVendorPayment(
  id: string,
): Promise<PublicVendorPayment> {
  const res = await apiPost<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}/approve`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment approve failed');
  }
  return normalisePayment(res.data);
}

/** `POST /vendor-payments/:id/release` — Nest `payment.release` */
export async function releaseVendorPayment(
  id: string,
): Promise<PublicVendorPayment> {
  const res = await apiPost<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}/release`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment release failed');
  }
  return normalisePayment(res.data);
}

/** `POST /vendor-payments/:id/verify` — Nest `payment.approve` */
export async function verifyVendorPayment(
  id: string,
): Promise<PublicVendorPayment> {
  const res = await apiPost<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}/verify`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment verify failed');
  }
  return normalisePayment(res.data);
}

/** `POST /vendor-payments/:id/post` — Nest `payment.approve` */
export async function postVendorPayment(
  id: string,
): Promise<PublicVendorPayment> {
  const res = await apiPost<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}/post`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment post failed');
  }
  return normalisePayment(res.data);
}

/** `POST /vendor-payments/:id/cancel` — Nest `payment.release` */
export async function cancelVendorPayment(
  id: string,
): Promise<PublicVendorPayment> {
  const res = await apiPost<PublicVendorPayment>(
    `/vendor-payments/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor payment cancel failed');
  }
  return normalisePayment(res.data);
}

/**
 * Posted invoices for payment allocation.
 * Nest payment requires posted + matched / exception-approved.
 * Uses `GET /vendor-invoices` (`vendor_invoice.view`).
 */
export async function fetchPayableInvoices(input: {
  projectId: string;
  vendorId: string;
}): Promise<PayableInvoiceOption[]> {
  const res = await apiGet<PayableInvoiceOption[]>('/vendor-invoices', {
    page: 1,
    limit: 100,
    projectId: input.projectId,
    vendorId: input.vendorId,
    status: VendorInvoiceStatus.Posted,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    documentNumber: row.documentNumber,
    invoiceNumber: row.invoiceNumber,
    vendorId: row.vendorId,
    remainingPayable: Number(row.remainingPayable ?? 0),
    status: row.status,
    matchingStatus: row.matchingStatus,
    exceptionApproved: Boolean(row.exceptionApproved),
  }));
}

/** `GET /company-bank-accounts` — Nest `bank.view` */
export async function fetchBankAccountOptions(
  projectId?: string,
): Promise<BankAccountOption[]> {
  const res = await apiGet<
    Array<{
      id: string;
      accountName?: string;
      bankName?: string;
      accountNumberMasked?: string;
      status?: string;
    }>
  >('/company-bank-accounts', {
    page: 1,
    limit: 100,
    status: 'active',
    projectId: projectId || undefined,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    label: [row.accountName, row.bankName, row.accountNumberMasked]
      .filter(Boolean)
      .join(' · '),
  }));
}

export type VendorOption = {
  id: string;
  vendorCode: string;
  legalName: string;
};

/** `GET /vendors` — Nest `vendor.view` */
export async function searchVendorOptions(
  search = '',
  limit = 50,
): Promise<VendorOption[]> {
  const res = await apiGet<VendorOption[]>('/vendors', {
    page: 1,
    limit,
    search: search.trim() || undefined,
  });
  return res.data ?? [];
}
