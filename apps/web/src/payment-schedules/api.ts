import { apiGet, apiPost } from '@/api/client';
import type {
  ApprovePaymentScheduleInput,
  BookingOption,
  GenerateDemandInput,
  GenerateDemandResult,
  GeneratePaymentScheduleInput,
  ListPaymentSchedulesQuery,
  MarkDueInput,
  MarkOverdueJobResult,
  OverdueScheduleLineRow,
  PaginatedOverdueLines,
  PaginatedPaymentSchedules,
  PublicPaymentDemand,
  PublicPaymentSchedule,
  RejectPaymentScheduleInput,
  RevisePaymentScheduleInput,
} from './types';

const BASE = '/payment-schedules';

type BookingRow = {
  id: string;
  bookingNumber: string;
  customerId: string;
  status: string;
  approvedPrice: number;
};

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toIsoOptional(value: unknown): string | undefined {
  const iso = toIso(value);
  return iso ?? undefined;
}

function normaliseLine(
  line: PublicPaymentSchedule['lines'][number],
): PublicPaymentSchedule['lines'][number] {
  return {
    ...line,
    dueDate: toIso(line.dueDate),
    markedDueAt: toIso(line.markedDueAt),
    overdueAt: toIso(line.overdueAt),
  };
}

function normaliseSchedule(row: PublicPaymentSchedule): PublicPaymentSchedule {
  return {
    ...row,
    remarks: row.remarks ?? null,
    rootScheduleId: row.rootScheduleId ?? null,
    revisedFromId: row.revisedFromId ?? null,
    approvalRequestId: row.approvalRequestId ?? null,
    lines: (row.lines ?? []).map(normaliseLine),
    createdAt: toIsoOptional(row.createdAt),
    updatedAt: toIsoOptional(row.updatedAt),
  };
}

function normaliseDemand(row: PublicPaymentDemand): PublicPaymentDemand {
  return {
    ...row,
    dueDate: toIso(row.dueDate),
    issuedAt: toIso(row.issuedAt) ?? row.issuedAt,
    createdAt: toIsoOptional(row.createdAt),
    updatedAt: toIsoOptional(row.updatedAt),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedPaymentSchedules['meta'] {
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

function normaliseOverdueRow(row: OverdueScheduleLineRow): OverdueScheduleLineRow {
  return {
    ...row,
    line: {
      ...row.line,
      dueDate: toIso(row.line.dueDate),
      overdueAt: toIso(row.line.overdueAt),
    },
  };
}

/** `GET /payment-schedules` — `collection.view` */
export async function fetchPaymentSchedules(
  query: ListPaymentSchedulesQuery = {},
): Promise<PaginatedPaymentSchedules> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicPaymentSchedule[]>(BASE, {
    page,
    limit,
    search: query.search,
    status: query.status,
    scheduleType: query.scheduleType,
    bookingId: query.bookingId,
    projectId: query.projectId,
    customerId: query.customerId,
    sortOrder: query.sortOrder,
  });
  return {
    items: (res.data ?? []).map(normaliseSchedule),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /payment-schedules/:id` — `collection.view` */
export async function fetchPaymentSchedule(
  id: string,
): Promise<PublicPaymentSchedule> {
  const res = await apiGet<PublicPaymentSchedule>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Payment schedule not found');
  }
  return normaliseSchedule(res.data);
}

/** `GET /payment-schedules/overdue` — `collection.view` */
export async function fetchOverdueScheduleLines(query: {
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedOverdueLines> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<OverdueScheduleLineRow[]>(`${BASE}/overdue`, {
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map(normaliseOverdueRow),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `POST /payment-schedules/generate` — `collection.create` */
export async function generatePaymentSchedule(
  input: GeneratePaymentScheduleInput,
): Promise<PublicPaymentSchedule> {
  const res = await apiPost<PublicPaymentSchedule>(`${BASE}/generate`, input);
  if (!res.data) {
    throw new Error(res.message || 'Generate schedule failed');
  }
  return normaliseSchedule(res.data);
}

/** `POST /payment-schedules/:id/submit-approval` — `collection.create` */
export async function submitPaymentScheduleForApproval(
  id: string,
): Promise<PublicPaymentSchedule> {
  const res = await apiPost<PublicPaymentSchedule>(
    `${BASE}/${id}/submit-approval`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit for approval failed');
  }
  return normaliseSchedule(res.data);
}

/** `POST /payment-schedules/:id/approve` — `collection.approve` */
export async function approvePaymentSchedule(
  id: string,
  input: ApprovePaymentScheduleInput = {},
): Promise<PublicPaymentSchedule> {
  const res = await apiPost<PublicPaymentSchedule>(
    `${BASE}/${id}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve schedule failed');
  }
  return normaliseSchedule(res.data);
}

/** `POST /payment-schedules/:id/reject` — `collection.approve` */
export async function rejectPaymentSchedule(
  id: string,
  input: RejectPaymentScheduleInput,
): Promise<PublicPaymentSchedule> {
  const res = await apiPost<PublicPaymentSchedule>(
    `${BASE}/${id}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject schedule failed');
  }
  return normaliseSchedule(res.data);
}

/** `POST /payment-schedules/:id/revise` — `collection.create` */
export async function revisePaymentSchedule(
  id: string,
  input: RevisePaymentScheduleInput,
): Promise<PublicPaymentSchedule> {
  const res = await apiPost<PublicPaymentSchedule>(
    `${BASE}/${id}/revise`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Revise schedule failed');
  }
  return normaliseSchedule(res.data);
}

/** `POST /payment-schedules/:id/mark-due` — `collection.create` */
export async function markScheduleLineDue(
  id: string,
  input: MarkDueInput,
): Promise<PublicPaymentSchedule> {
  const res = await apiPost<PublicPaymentSchedule>(
    `${BASE}/${id}/mark-due`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Mark due failed');
  }
  return normaliseSchedule(res.data);
}

/** `POST /payment-schedules/:id/demands` — `collection.create` */
export async function generatePaymentDemand(
  id: string,
  input: GenerateDemandInput,
): Promise<GenerateDemandResult> {
  const res = await apiPost<GenerateDemandResult>(`${BASE}/${id}/demands`, input);
  if (!res.data?.schedule || !res.data?.demand) {
    throw new Error(res.message || 'Generate demand failed');
  }
  return {
    schedule: normaliseSchedule(res.data.schedule),
    demand: normaliseDemand(res.data.demand),
  };
}

/** `POST /payment-schedules/jobs/mark-overdue` — `collection.approve` */
export async function runMarkOverdueJob(): Promise<MarkOverdueJobResult> {
  const res = await apiPost<MarkOverdueJobResult>(`${BASE}/jobs/mark-overdue`);
  if (!res.data) {
    throw new Error(res.message || 'Mark overdue job failed');
  }
  return res.data;
}

/**
 * `GET /bookings` — `booking.view`
 * Eligible collection statuses mirror Nest generate rules.
 */
export async function fetchBookingOptionsForSchedule(
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
      approvedPrice: row.approvedPrice,
    }));
}
