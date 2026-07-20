import { apiGet, apiPost } from '@/api/client';
import { remainingOnDemandLine } from './allocation';
import type {
  AllocatableDemand,
  BankAccountOption,
  BookingOption,
  CancelCustomerReceiptInput,
  CreateCustomerReceiptInput,
  ListCustomerReceiptsQuery,
  PaginatedCustomerReceipts,
  PublicCustomerReceipt,
} from './types';

const BASE = '/customer-receipts';

type BankAccountRow = {
  id: string;
  accountCode: string;
  bankName: string;
  maskedAccountNumber: string;
};

type BookingRow = {
  id: string;
  bookingNumber: string;
  customerId: string;
  status: string;
  unitId: string;
};

type ScheduleRow = {
  id: string;
  status: string;
  lines: Array<{
    milestone: string;
    amount: number;
    tax: number;
    collectedAmount: number;
    demandId: string | null;
    dueDate: string | null;
    status: string;
  }>;
};

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseReceipt(row: PublicCustomerReceipt): PublicCustomerReceipt {
  return {
    ...row,
    receiptDate: toIso(row.receiptDate) ?? row.receiptDate,
    postedAt: toIso(row.postedAt),
    cancelledAt: toIso(row.cancelledAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedCustomerReceipts['meta'] {
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

/** `GET /customer-receipts` — `collection.view` */
export async function fetchCustomerReceipts(
  query: ListCustomerReceiptsQuery = {},
): Promise<PaginatedCustomerReceipts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCustomerReceipt[]>(BASE, {
    page,
    limit,
    search: query.search,
    status: query.status,
    bookingId: query.bookingId,
    customerId: query.customerId,
    projectId: query.projectId,
    sourceType: query.sourceType,
    sortOrder: query.sortOrder,
  });
  return {
    items: (res.data ?? []).map(normaliseReceipt),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /customer-receipts/:id` — `collection.view` */
export async function fetchCustomerReceipt(
  id: string,
): Promise<PublicCustomerReceipt> {
  const res = await apiGet<PublicCustomerReceipt>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Receipt not found');
  }
  return normaliseReceipt(res.data);
}

/** `POST /customer-receipts` — `collection.create` */
export async function createCustomerReceipt(
  input: CreateCustomerReceiptInput,
): Promise<PublicCustomerReceipt> {
  const res = await apiPost<PublicCustomerReceipt>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create receipt failed');
  }
  return normaliseReceipt(res.data);
}

/** `POST /customer-receipts/:id/post` — `collection.approve` */
export async function postCustomerReceipt(
  id: string,
): Promise<PublicCustomerReceipt> {
  const res = await apiPost<PublicCustomerReceipt>(`${BASE}/${id}/post`);
  if (!res.data) {
    throw new Error(res.message || 'Post receipt failed');
  }
  return normaliseReceipt(res.data);
}

/** `POST /customer-receipts/:id/cancel` — `collection.create` */
export async function cancelCustomerReceipt(
  id: string,
  input: CancelCustomerReceiptInput = {},
): Promise<PublicCustomerReceipt> {
  const res = await apiPost<PublicCustomerReceipt>(
    `${BASE}/${id}/cancel`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel receipt failed');
  }
  return normaliseReceipt(res.data);
}

/** `POST /customer-receipts/:id/regenerate-pdf` — `collection.view` */
export async function regenerateCustomerReceiptPdf(
  id: string,
): Promise<PublicCustomerReceipt> {
  const res = await apiPost<PublicCustomerReceipt>(
    `${BASE}/${id}/regenerate-pdf`,
  );
  if (!res.data) {
    throw new Error(res.message || 'PDF regeneration failed');
  }
  return normaliseReceipt(res.data);
}

/**
 * `GET /company-bank-accounts` — `bank.view`
 * Thin list for bank source selector only.
 */
export async function fetchBankAccountOptions(
  projectId?: string | null,
): Promise<BankAccountOption[]> {
  const res = await apiGet<BankAccountRow[]>('/company-bank-accounts', {
    limit: 100,
    projectId: projectId ?? undefined,
  });
  return (res.data ?? []).map((row: BankAccountRow) => ({
    id: row.id,
    label: `${row.bankName} · ${row.accountCode} · ${row.maskedAccountNumber}`,
  }));
}

/**
 * `GET /bookings` — `booking.view`
 * Eligible collection statuses mirror Nest create rules.
 */
export async function fetchBookingOptions(
  projectId?: string | null,
): Promise<BookingOption[]> {
  const res = await apiGet<BookingRow[]>('/bookings', {
    limit: 100,
    projectId: projectId ?? undefined,
  });
  const eligible = new Set(['booked', 'agreement', 'registered']);
  return (res.data ?? [])
    .filter((row: BookingRow) => eligible.has(row.status))
    .map((row: BookingRow) => ({
      id: row.id,
      label: `${row.bookingNumber} · ${row.status}`,
      customerId: row.customerId,
      status: row.status,
    }));
}

/**
 * Derive allocatable demands from `GET /payment-schedules?bookingId=`
 * (`collection.view`). Lines with `demandId` and remaining balance.
 */
export async function fetchAllocatableDemands(
  bookingId: string,
): Promise<AllocatableDemand[]> {
  const res = await apiGet<ScheduleRow[]>('/payment-schedules', {
    bookingId,
    status: 'active',
    limit: 20,
  });

  const demands: AllocatableDemand[] = [];
  for (const schedule of res.data ?? []) {
    for (const line of schedule.lines ?? []) {
      if (!line.demandId) continue;
      const remaining = remainingOnDemandLine({
        amount: line.amount,
        tax: line.tax,
        collectedAmount: line.collectedAmount,
      });
      if (remaining <= 0.009) continue;
      demands.push({
        demandId: line.demandId,
        milestone: line.milestone,
        remainingAmount: remaining,
        dueDate: toIso(line.dueDate),
      });
    }
  }
  return demands;
}
