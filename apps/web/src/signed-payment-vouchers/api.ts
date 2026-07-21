import { apiGet, apiPost } from '@/api/client';
import type {
  CancelSignedPaymentVoucherInput,
  ListSignedPaymentVouchersQuery,
  PaginatedSignedPaymentVouchers,
  PublicSignedPaymentVoucher,
  ReverseSignedPaymentVoucherInput,
} from './types';

const BASE = '/signed-payment-vouchers';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseVoucher(
  row: PublicSignedPaymentVoucher,
): PublicSignedPaymentVoucher {
  return {
    ...row,
    capturedAt: toIso(row.capturedAt) ?? row.capturedAt,
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    postedAt: toIso(row.postedAt),
    reversedAt: toIso(row.reversedAt),
    cancelledAt: toIso(row.cancelledAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedSignedPaymentVouchers['meta'] {
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

/** `GET /signed-payment-vouchers` — `payment.view` */
export async function fetchSignedPaymentVouchers(
  query: ListSignedPaymentVouchersQuery = {},
): Promise<PaginatedSignedPaymentVouchers> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicSignedPaymentVoucher[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    voucherType: query.voucherType,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseVoucher),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /signed-payment-vouchers/:id` — `payment.view` */
export async function fetchSignedPaymentVoucher(
  id: string,
): Promise<PublicSignedPaymentVoucher> {
  const res = await apiGet<PublicSignedPaymentVoucher>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Signed payment voucher unavailable');
  }
  return normaliseVoucher(res.data);
}

/** `POST /signed-payment-vouchers/:id/approve` — `payment.approve` */
export async function approveSignedPaymentVoucher(
  id: string,
): Promise<PublicSignedPaymentVoucher> {
  const res = await apiPost<PublicSignedPaymentVoucher>(`${BASE}/${id}/approve`);
  if (!res.data) {
    throw new Error(res.message || 'Approve failed');
  }
  return normaliseVoucher(res.data);
}

/** `POST /signed-payment-vouchers/:id/post` — `payment.approve` */
export async function postSignedPaymentVoucher(
  id: string,
): Promise<PublicSignedPaymentVoucher> {
  const res = await apiPost<PublicSignedPaymentVoucher>(`${BASE}/${id}/post`);
  if (!res.data) {
    throw new Error(res.message || 'Post failed');
  }
  return normaliseVoucher(res.data);
}

/** `POST /signed-payment-vouchers/:id/reverse` — `payment.approve` */
export async function reverseSignedPaymentVoucher(
  id: string,
  input: ReverseSignedPaymentVoucherInput,
): Promise<PublicSignedPaymentVoucher> {
  const res = await apiPost<PublicSignedPaymentVoucher>(
    `${BASE}/${id}/reverse`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reverse failed');
  }
  return normaliseVoucher(res.data);
}

/** `POST /signed-payment-vouchers/:id/cancel` — `payment.release` */
export async function cancelSignedPaymentVoucher(
  id: string,
  input: CancelSignedPaymentVoucherInput,
): Promise<PublicSignedPaymentVoucher> {
  const res = await apiPost<PublicSignedPaymentVoucher>(
    `${BASE}/${id}/cancel`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel failed');
  }
  return normaliseVoucher(res.data);
}
