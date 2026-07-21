import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateCatalogInput,
  CreateDeliveryTermInput,
  CreatePaymentTermInput,
  CreateTaxRuleInput,
  ListMastersQuery,
  MasterResource,
  MasterRow,
  PaginatedMasters,
  PublicCatalogItem,
  PublicDeliveryTerm,
  PublicPaymentTerm,
  PublicTaxRule,
  UpdateCatalogInput,
  UpdateDeliveryTermInput,
  UpdatePaymentTermInput,
  UpdateTaxRuleInput,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseRow<T extends MasterRow>(row: T): T {
  return {
    ...row,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedMasters<MasterRow>['meta'] {
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

const BASE = '/procurement-masters';

/** `GET /procurement-masters/:resource` */
export async function fetchMasterList<T extends MasterRow>(
  resource: MasterResource,
  query: ListMastersQuery = {},
): Promise<PaginatedMasters<T>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<T[]>(`${BASE}/${resource}`, {
    page,
    limit,
    search: query.search || undefined,
    status: query.status || undefined,
  });
  return {
    items: (res.data ?? []).map((row) => normaliseRow(row)),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `POST /procurement-masters/:resource` */
export async function createMaster(
  resource: 'purchase-categories' | 'material-categories' | 'vendor-categories',
  input: CreateCatalogInput,
): Promise<PublicCatalogItem>;
export async function createMaster(
  resource: 'payment-terms',
  input: CreatePaymentTermInput,
): Promise<PublicPaymentTerm>;
export async function createMaster(
  resource: 'delivery-terms',
  input: CreateDeliveryTermInput,
): Promise<PublicDeliveryTerm>;
export async function createMaster(
  resource: 'tax-rules',
  input: CreateTaxRuleInput,
): Promise<PublicTaxRule>;
export async function createMaster(
  resource: MasterResource,
  input:
    | CreateCatalogInput
    | CreatePaymentTermInput
    | CreateDeliveryTermInput
    | CreateTaxRuleInput,
): Promise<MasterRow> {
  const res = await apiPost<MasterRow>(`${BASE}/${resource}`, input);
  if (!res.data) throw new Error(res.message || 'Create failed');
  return normaliseRow(res.data);
}

/** `PATCH /procurement-masters/:resource/:id` */
export async function updateMaster(
  resource: MasterResource,
  id: string,
  input:
    | UpdateCatalogInput
    | UpdatePaymentTermInput
    | UpdateDeliveryTermInput
    | UpdateTaxRuleInput,
): Promise<MasterRow> {
  const res = await apiPatch<MasterRow>(
    `${BASE}/${resource}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) throw new Error(res.message || 'Update failed');
  return normaliseRow(res.data);
}

/** `POST /procurement-masters/seed-defaults` — `procurement_master.manage` */
export async function seedProcurementMasterDefaults(): Promise<void> {
  const res = await apiPost(`${BASE}/seed-defaults`, {});
  if (!res.success) {
    throw new Error(res.message || 'Seed defaults failed');
  }
}
