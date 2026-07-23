import { apiGet, apiPost } from '@/api/client';
import type {
  AvailableStock,
  CreateStockReservationInput,
  ListStockReservationsQuery,
  PaginatedStockReservations,
  PublicStockReservation,
  ReleaseStockReservationInput,
} from './types';

const BASE = '/stock-reservations';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseReservation(
  row: PublicStockReservation,
): PublicStockReservation {
  return {
    ...row,
    id: String(row.id),
    reservationNumber: row.reservationNumber,
    projectId: String(row.projectId),
    materialId: String(row.materialId),
    location: row.location ?? '',
    unit: row.unit,
    quantity: Number(row.quantity ?? 0),
    baseUnitQuantity: Number(row.baseUnitQuantity ?? 0),
    releasedBaseQuantity: Number(row.releasedBaseQuantity ?? 0),
    remainingBaseQuantity: Number(
      row.remainingBaseQuantity ??
        Number(row.baseUnitQuantity ?? 0) -
          Number(row.releasedBaseQuantity ?? 0),
    ),
    sourceType: row.sourceType,
    sourceId: row.sourceId ?? null,
    status: row.status,
    expiresAt: toIso(row.expiresAt),
    notes: row.notes ?? null,
    createdBy: String(row.createdBy),
    releasedBy: row.releasedBy == null ? null : String(row.releasedBy),
    releasedAt: toIso(row.releasedAt),
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedStockReservations['meta'] {
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

/** `GET /stock-reservations` — Nest `stock.view` */
export async function fetchStockReservations(
  query: ListStockReservationsQuery = {},
): Promise<PaginatedStockReservations> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicStockReservation[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    materialId: query.materialId,
    status: query.status,
    sourceType: query.sourceType,
  });
  return {
    items: (res.data ?? []).map(normaliseReservation),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /stock-reservations/:id` — Nest `stock.view` */
export async function fetchStockReservation(
  id: string,
): Promise<PublicStockReservation> {
  const res = await apiGet<PublicStockReservation>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Stock reservation unavailable');
  }
  return normaliseReservation(res.data);
}

/** `GET /stock-reservations/available` — Nest `stock.view` */
export async function fetchAvailableStock(query: {
  projectId: string;
  materialId: string;
  location?: string;
}): Promise<AvailableStock> {
  const res = await apiGet<AvailableStock>(`${BASE}/available`, {
    projectId: query.projectId,
    materialId: query.materialId,
    location: query.location,
  });
  if (!res.data) {
    throw new Error(res.message || 'Available stock unavailable');
  }
  return {
    projectId: String(res.data.projectId),
    materialId: String(res.data.materialId),
    location: res.data.location ?? '',
    onHandBaseQty: Number(res.data.onHandBaseQty ?? 0),
    reservedBaseQty: Number(res.data.reservedBaseQty ?? 0),
    availableBaseQty: Number(res.data.availableBaseQty ?? 0),
  };
}

/** `POST /stock-reservations` — Nest `stock.reserve` */
export async function createStockReservation(
  input: CreateStockReservationInput,
): Promise<PublicStockReservation> {
  const res = await apiPost<PublicStockReservation>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create stock reservation failed');
  }
  return normaliseReservation(res.data);
}

/** `POST /stock-reservations/:id/release` — Nest `stock.reserve` */
export async function releaseStockReservation(
  id: string,
  input: ReleaseStockReservationInput = {},
): Promise<PublicStockReservation> {
  const res = await apiPost<PublicStockReservation>(
    `${BASE}/${encodeURIComponent(id)}/release`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Release stock reservation failed');
  }
  return normaliseReservation(res.data);
}

/** `POST /stock-reservations/:id/cancel` — Nest `stock.reserve` */
export async function cancelStockReservation(
  id: string,
): Promise<PublicStockReservation> {
  const res = await apiPost<PublicStockReservation>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel stock reservation failed');
  }
  return normaliseReservation(res.data);
}
