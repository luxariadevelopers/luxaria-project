import { apiGet, apiPatch, apiPost } from '@/api/client';
import {
  MATERIAL_LEDGER_CATEGORIES,
  type CreateMaterialInput,
  type ListMaterialsQuery,
  type ListStockLedgerQuery,
  type MaterialLedgerOption,
  type MaterialUnitOption,
  type PaginatedMaterials,
  type PaginatedStockLedger,
  type PublicMaterial,
  type PublicStockBalance,
  type PublicStockLedgerEntry,
  type UpdateMaterialInput,
} from './types';


function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseMaterial(row: PublicMaterial): PublicMaterial {
  return {
    ...row,
    specification: row.specification ?? null,
    brand: row.brand ?? null,
    alternateUnits: row.alternateUnits ?? [],
    conversionFactors: (row.conversionFactors ?? []).map((f) => ({
      unit: f.unit,
      factorToBase: f.factorToBase,
    })),
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedMaterials['meta'] {
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


function normaliseBalance(row: PublicStockBalance): PublicStockBalance {
  return {
    ...row,
    id: row.id ?? null,
    location: row.location ?? '',
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function normaliseLedgerEntry(
  row: PublicStockLedgerEntry,
): PublicStockLedgerEntry {
  return {
    ...row,
    referenceId: row.referenceId ?? null,
    location: row.location ?? null,
    batch: row.batch ?? null,
    reversalOfId: row.reversalOfId ?? null,
    reversedById: row.reversedById ?? null,
    notes: row.notes ?? null,
    transactionDate: toIso(row.transactionDate) ?? String(row.transactionDate),
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
  };
}

/** `GET /materials/units` — `material.view` */
export async function fetchMaterialUnits(): Promise<MaterialUnitOption[]> {
  const res = await apiGet<MaterialUnitOption[]>('/materials/units');
  return res.data ?? [];
}

/** `GET /materials` — `material.view` */
export async function fetchMaterials(
  query: ListMaterialsQuery = {},
): Promise<PaginatedMaterials> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicMaterial[]>('/materials', {
    page,
    limit,
    search: query.search || undefined,
    status: query.status || undefined,
    category: query.category || undefined,
    baseUnit: query.baseUnit || undefined,
    brand: query.brand || undefined,
    ledgerAccountId: query.ledgerAccountId || undefined,
    sortOrder: query.sortOrder || undefined,
  });
  return {
    items: (res.data ?? []).map(normaliseMaterial),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /materials/:id` — `material.view` */
export async function fetchMaterial(id: string): Promise<PublicMaterial> {
  const res = await apiGet<PublicMaterial>(
    `/materials/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Material unavailable');
  }
  return normaliseMaterial(res.data);
}

/** `POST /materials` — `material.manage` */
export async function createMaterial(
  input: CreateMaterialInput,
): Promise<PublicMaterial> {
  const res = await apiPost<PublicMaterial>('/materials', input);
  if (!res.data) {
    throw new Error(res.message || 'Create material failed');
  }
  return normaliseMaterial(res.data);
}

/** `PATCH /materials/:id` — `material.manage` */
export async function updateMaterial(
  id: string,
  input: UpdateMaterialInput,
): Promise<PublicMaterial> {
  const res = await apiPatch<PublicMaterial>(
    `/materials/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update material failed');
  }
  return normaliseMaterial(res.data);
}

type AccountListRow = {
  id: string;
  accountCode: string;
  accountName: string;
  accountCategory: string;
  status: string;
  isControlAccount?: boolean;
  allowManualPosting?: boolean;
};

/**
 * Active COA rows eligible as material ledgers — `GET /accounts` · `account.view`.
 * Categories match Nest `ALLOWED_LEDGER_CATEGORIES`.
 */
export async function fetchMaterialLedgerOptions(): Promise<
  MaterialLedgerOption[]
> {
  const pages = await Promise.all(
    MATERIAL_LEDGER_CATEGORIES.map(async (accountCategory) => {
      const res = await apiGet<AccountListRow[]>('/accounts', {
        page: 1,
        limit: 100,
        accountCategory,
        status: 'active',
      });
      return res.data ?? [];
    }),
  );

  const byId = new Map<string, MaterialLedgerOption>();
  for (const row of pages.flat()) {
    if (row.isControlAccount && !row.allowManualPosting) continue;
    byId.set(row.id, {
      id: row.id,
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountCategory: row.accountCategory,
    });
  }
  return [...byId.values()].sort((a, b) =>
    a.accountCode.localeCompare(b.accountCode),
  );
}


/** `GET /stock-ledger/balance` — `stock.view`. */
export async function fetchMaterialProjectStock(input: {
  projectId: string;
  materialId: string;
  location?: string;
}): Promise<PublicStockBalance> {
  const res = await apiGet<PublicStockBalance>('/stock-ledger/balance', {
    projectId: input.projectId,
    materialId: input.materialId,
    location: input.location,
  });
  if (!res.data) {
    throw new Error('Stock balance not found');
  }
  return normaliseBalance(res.data);
}

/** `GET /stock-ledger` filtered by material — `stock.view`. */
export async function fetchMaterialUsageLedger(
  query: ListStockLedgerQuery,
): Promise<PaginatedStockLedger> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicStockLedgerEntry[]>('/stock-ledger', {
    page,
    limit,
    projectId: query.projectId,
    materialId: query.materialId,
    transactionType: query.transactionType,
    location: query.location,
    search: query.search,
  });
  return {
    items: (res.data ?? []).map(normaliseLedgerEntry),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}
