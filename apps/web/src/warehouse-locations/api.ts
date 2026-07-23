import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateWarehouseLocationInput,
  ListWarehouseLocationsQuery,
  PaginatedWarehouseLocations,
  PublicWarehouseLocation,
  UpdateWarehouseLocationInput,
} from './types';

const BASE = '/warehouse-locations';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseLocation(
  row: PublicWarehouseLocation,
): PublicWarehouseLocation {
  return {
    ...row,
    id: String(row.id),
    companyId: String(row.companyId),
    projectId: String(row.projectId),
    warehouseId: String(row.warehouseId),
    parentId: row.parentId == null ? null : String(row.parentId),
    level: row.level,
    code: row.code,
    name: row.name,
    capacity: row.capacity == null ? null : Number(row.capacity),
    status: row.status,
    locationPath: row.locationPath,
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedWarehouseLocations['meta'] {
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

/** `GET /warehouse-locations` — Nest `site.view` */
export async function fetchWarehouseLocations(
  query: ListWarehouseLocationsQuery = {},
): Promise<PaginatedWarehouseLocations> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicWarehouseLocation[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    warehouseId: query.warehouseId,
    parentId: query.parentId,
    level: query.level,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseLocation),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /warehouse-locations/:id` — Nest `site.view` */
export async function fetchWarehouseLocation(
  id: string,
): Promise<PublicWarehouseLocation> {
  const res = await apiGet<PublicWarehouseLocation>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Warehouse location unavailable');
  }
  return normaliseLocation(res.data);
}

/** `POST /warehouse-locations` — Nest `site.manage` */
export async function createWarehouseLocation(
  input: CreateWarehouseLocationInput,
): Promise<PublicWarehouseLocation> {
  const res = await apiPost<PublicWarehouseLocation>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create warehouse location failed');
  }
  return normaliseLocation(res.data);
}

/** `PATCH /warehouse-locations/:id` — Nest `site.manage` */
export async function updateWarehouseLocation(
  id: string,
  input: UpdateWarehouseLocationInput,
): Promise<PublicWarehouseLocation> {
  const res = await apiPatch<PublicWarehouseLocation>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update warehouse location failed');
  }
  return normaliseLocation(res.data);
}
