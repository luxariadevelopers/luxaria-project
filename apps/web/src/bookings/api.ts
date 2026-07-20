import { apiGet } from '@/api/client';
import type {
  ListBookingsQuery,
  PaginatedBookings,
  PublicBooking,
  PublicBookingBroker,
  PublicBookingPaymentPlan,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return toIso(value) ?? null;
}

function emptyPlan(): PublicBookingPaymentPlan {
  return { name: null, installments: [] };
}

function emptyBroker(): PublicBookingBroker {
  return {
    name: null,
    firmName: null,
    phone: null,
    email: null,
    commissionPercent: null,
  };
}

function normaliseBooking(row: PublicBooking): PublicBooking {
  const plan = row.paymentPlan ?? emptyPlan();
  const broker = row.broker ?? emptyBroker();
  return {
    ...row,
    jointApplicantId: row.jointApplicantId ?? null,
    bookingDate: toIso(row.bookingDate) ?? String(row.bookingDate),
    holdExpiresAt: toIsoOrNull(row.holdExpiresAt),
    pdfGeneratedAt: toIsoOrNull(row.pdfGeneratedAt),
    expiredAt: toIsoOrNull(row.expiredAt),
    cancelledAt: toIsoOrNull(row.cancelledAt),
    cancellationReason: row.cancellationReason ?? null,
    remarks: row.remarks ?? null,
    approvalRequestId: row.approvalRequestId ?? null,
    pdfPath: row.pdfPath ?? null,
    discountApprovalRequired: Boolean(row.discountApprovalRequired),
    discountApproved: Boolean(row.discountApproved),
    paymentPlan: {
      name: plan.name ?? null,
      installments: (plan.installments ?? []).map((i) => ({
        sequence: i.sequence,
        label: i.label,
        dueDate: toIsoOrNull(i.dueDate),
        amount: i.amount,
        percent: i.percent ?? null,
      })),
    },
    broker: {
      name: broker.name ?? null,
      firmName: broker.firmName ?? null,
      phone: broker.phone ?? null,
      email: broker.email ?? null,
      commissionPercent: broker.commissionPercent ?? null,
    },
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedBookings['meta'] {
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

/** `GET /bookings` — `booking.view` */
export async function fetchBookings(
  query: ListBookingsQuery = {},
): Promise<PaginatedBookings> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicBooking[]>('/bookings', {
    page,
    limit,
    search: query.search || undefined,
    status: query.status || undefined,
    projectId: query.projectId || undefined,
    unitId: query.unitId || undefined,
    customerId: query.customerId || undefined,
    sortOrder: query.sortOrder || undefined,
  });
  return {
    items: (res.data ?? []).map(normaliseBooking),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /bookings/:id` — `booking.view` */
export async function fetchBooking(id: string): Promise<PublicBooking> {
  const res = await apiGet<PublicBooking>(
    `/bookings/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error('Booking not found');
  }
  return normaliseBooking(res.data);
}
