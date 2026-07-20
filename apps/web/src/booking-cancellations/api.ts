import { apiGet, apiPost } from '@/api/client';
import type {
  ApproveBookingCancellationInput,
  BankAccountOption,
  BookingOption,
  ListBookingCancellationsQuery,
  PaginatedBookingCancellations,
  ProcessRefundInput,
  PublicBookingCancellation,
  RejectBookingCancellationInput,
  RequestBookingCancellationInput,
  ReviewBookingCancellationInput,
} from './types';

const BASE = '/booking-cancellations';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(
  row: PublicBookingCancellation,
): PublicBookingCancellation {
  return {
    ...row,
    cancellationDate: toIso(row.cancellationDate) ?? row.cancellationDate,
    refundProcessedAt: toIso(row.refundProcessedAt),
    reviewedAt: toIso(row.reviewedAt),
    approvedAt: toIso(row.approvedAt),
    unitReleasedAt: toIso(row.unitReleasedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    documents: (row.documents ?? []).map((d) => ({
      ...d,
      uploadedAt: toIso(d.uploadedAt) ?? String(d.uploadedAt),
    })),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedBookingCancellations['meta'] {
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

/** `GET /booking-cancellations` — `booking.view` */
export async function fetchBookingCancellations(
  query: ListBookingCancellationsQuery = {},
): Promise<PaginatedBookingCancellations> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicBookingCancellation[]>(BASE, {
    page,
    limit,
    search: query.search,
    status: query.status,
    bookingId: query.bookingId,
    projectId: query.projectId,
    customerId: query.customerId,
    sortOrder: query.sortOrder,
  });
  return {
    items: (res.data ?? []).map(normalise),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /booking-cancellations/:id` — `booking.view` */
export async function fetchBookingCancellation(
  id: string,
): Promise<PublicBookingCancellation> {
  const res = await apiGet<PublicBookingCancellation>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Cancellation unavailable');
  }
  return normalise(res.data);
}

/** `POST /booking-cancellations` — `booking.cancel` */
export async function requestBookingCancellation(
  input: RequestBookingCancellationInput,
): Promise<PublicBookingCancellation> {
  const res = await apiPost<PublicBookingCancellation>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Cancellation request failed');
  }
  return normalise(res.data);
}

/** `POST …/:id/review` — `booking.cancel` */
export async function reviewBookingCancellation(
  id: string,
  input: ReviewBookingCancellationInput,
): Promise<PublicBookingCancellation> {
  const res = await apiPost<PublicBookingCancellation>(
    `${BASE}/${id}/review`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Review failed');
  }
  return normalise(res.data);
}

/** `POST …/:id/submit-approval` — `booking.cancel` */
export async function submitCancellationForApproval(
  id: string,
): Promise<PublicBookingCancellation> {
  const res = await apiPost<PublicBookingCancellation>(
    `${BASE}/${id}/submit-approval`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit for approval failed');
  }
  return normalise(res.data);
}

/** `POST …/:id/approve` — `booking.approve` */
export async function approveBookingCancellation(
  id: string,
  input: ApproveBookingCancellationInput = {},
): Promise<PublicBookingCancellation> {
  const res = await apiPost<PublicBookingCancellation>(
    `${BASE}/${id}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve failed');
  }
  return normalise(res.data);
}

/** `POST …/:id/reject` — `booking.approve` */
export async function rejectBookingCancellation(
  id: string,
  input: RejectBookingCancellationInput,
): Promise<PublicBookingCancellation> {
  const res = await apiPost<PublicBookingCancellation>(
    `${BASE}/${id}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject failed');
  }
  return normalise(res.data);
}

/** `POST …/:id/process-refund` — `collection.refund` (posts journal) */
export async function processCancellationRefund(
  id: string,
  input: ProcessRefundInput,
): Promise<PublicBookingCancellation> {
  const res = await apiPost<PublicBookingCancellation>(
    `${BASE}/${id}/process-refund`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Refund processing failed');
  }
  return normalise(res.data);
}

/** `POST …/:id/release-unit` — `booking.cancel` (final step) */
export async function releaseCancellationUnit(
  id: string,
): Promise<PublicBookingCancellation> {
  const res = await apiPost<PublicBookingCancellation>(
    `${BASE}/${id}/release-unit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Unit release failed');
  }
  return normalise(res.data);
}

/**
 * Booking selector for request form — `GET /bookings` (`booking.view`).
 * Nest only allows cancellation from reserved/booked/agreement.
 */
export async function fetchCancellableBookingOptions(
  projectId: string,
): Promise<BookingOption[]> {
  const cancellable = ['reserved', 'booked', 'agreement'] as const;
  const results = await Promise.all(
    cancellable.map((status) =>
      apiGet<
        Array<{
          id: string;
          bookingNumber: string;
          status: string;
          customerId: string;
          unitId: string;
          projectId: string;
        }>
      >('/bookings', {
        projectId,
        status,
        page: 1,
        limit: 100,
      }),
    ),
  );

  const map = new Map<string, BookingOption>();
  for (const res of results) {
    for (const row of res.data ?? []) {
      map.set(row.id, {
        id: row.id,
        bookingNumber: row.bookingNumber,
        status: row.status,
        customerId: row.customerId,
        unitId: row.unitId,
        projectId: row.projectId,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.bookingNumber.localeCompare(b.bookingNumber),
  );
}

/** `GET /company-bank-accounts` — `bank.view` */
export async function fetchBankAccountOptions(): Promise<BankAccountOption[]> {
  const res = await apiGet<
    Array<{
      id: string;
      accountCode: string;
      bankName: string;
      maskedAccountNumber: string;
    }>
  >('/company-bank-accounts', { limit: 100 });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    label: `${row.bankName} · ${row.accountCode} · ${row.maskedAccountNumber}`,
  }));
}
