import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ChangeUnitStatusInput,
  CreateUnitInput,
  LinkedBooking,
  ListUnitsQuery,
  PaginatedUnits,
  PublicUnit,
  UpdateUnitInput,
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

function normaliseUnit(row: PublicUnit): PublicUnit {
  return {
    ...row,
    facing: row.facing ?? null,
    parking: row.parking ?? null,
    bookingRefId: row.bookingRefId ?? null,
    notes: row.notes ?? null,
    additionalCharges: row.additionalCharges ?? 0,
    tax: row.tax ?? 0,
    totalPrice:
      row.totalPrice ??
      Math.round(
        ((row.basePrice ?? 0) +
          (row.additionalCharges ?? 0) +
          (row.tax ?? 0)) *
          100,
      ) / 100,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function normaliseBooking(row: LinkedBooking): LinkedBooking {
  return {
    ...row,
    bookingDate: toIso(row.bookingDate) ?? String(row.bookingDate),
    holdExpiresAt: toIsoOrNull(row.holdExpiresAt),
    cancelledAt: toIsoOrNull(row.cancelledAt),
    expiredAt: toIsoOrNull(row.expiredAt),
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedUnits['meta'] {
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

/** `GET /units` — `unit.view` */
export async function fetchUnits(
  query: ListUnitsQuery = {},
): Promise<PaginatedUnits> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicUnit[]>('/units', {
    page,
    limit,
    projectId: query.projectId,
    block: query.block || undefined,
    floor: query.floor || undefined,
    status: query.status || undefined,
    unitType: query.unitType || undefined,
    search: query.search || undefined,
    sortBy: query.sortBy || undefined,
    sortOrder: query.sortOrder || undefined,
  });
  return {
    items: (res.data ?? []).map(normaliseUnit),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /units/:id` — `unit.view` */
export async function fetchUnit(id: string): Promise<PublicUnit> {
  const res = await apiGet<PublicUnit>(`/units/${encodeURIComponent(id)}`);
  if (!res.data) {
    throw new Error(res.message || 'Unit unavailable');
  }
  return normaliseUnit(res.data);
}

/** `POST /units` — `unit.manage` */
export async function createUnit(input: CreateUnitInput): Promise<PublicUnit> {
  const res = await apiPost<PublicUnit>('/units', input);
  if (!res.data) {
    throw new Error(res.message || 'Create unit failed');
  }
  return normaliseUnit(res.data);
}

/** `PATCH /units/:id` — `unit.manage` */
export async function updateUnit(
  id: string,
  input: UpdateUnitInput,
): Promise<PublicUnit> {
  const res = await apiPatch<PublicUnit>(
    `/units/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update unit failed');
  }
  return normaliseUnit(res.data);
}

/** `POST /units/:id/status` — `unit.manage` */
export async function changeUnitStatus(
  id: string,
  input: ChangeUnitStatusInput,
): Promise<PublicUnit> {
  const res = await apiPost<PublicUnit>(
    `/units/${encodeURIComponent(id)}/status`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Status change failed');
  }
  return normaliseUnit(res.data);
}

/** `GET /bookings?unitId=` — `booking.view` */
export async function fetchBookingsForUnit(
  unitId: string,
): Promise<LinkedBooking[]> {
  const res = await apiGet<LinkedBooking[]>('/bookings', {
    unitId,
    page: 1,
    limit: 50,
    sortOrder: 'desc',
  });
  return (res.data ?? []).map(normaliseBooking);
}

/** `GET /bookings/:id` — `booking.view` */
export async function fetchBooking(id: string): Promise<LinkedBooking> {
  const res = await apiGet<LinkedBooking>(
    `/bookings/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Booking unavailable');
  }
  return normaliseBooking(res.data);
}
