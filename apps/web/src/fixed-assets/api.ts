import { apiGet } from '@/api/client';
import type {
  FixedAssetListRow,
  ListFixedAssetsQuery,
  PaginatedFixedAssets,
  PublicFixedAsset,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedFixedAssets['meta'] {
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

function toListRow(row: PublicFixedAsset): FixedAssetListRow {
  return {
    id: row.id,
    assetNumber: row.assetNumber,
    name: row.name,
    category: row.category,
    capitalizationDate: row.capitalizationDate,
    grossBlock: row.grossBlock,
    netBlock: row.netBlock,
    status: row.status,
    projectId: row.projectId,
  };
}

function normalise(row: PublicFixedAsset): PublicFixedAsset {
  return {
    ...row,
    capitalizationDate: toIso(row.capitalizationDate) ?? '',
    createdAt: toIso(row.createdAt),
  };
}

/** `GET /fixed-assets` — `fixed_asset.view` */
export async function fetchFixedAssets(
  query: ListFixedAssetsQuery = {},
): Promise<PaginatedFixedAssets> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicFixedAsset[]>('/fixed-assets', {
    page,
    limit,
    companyId: query.companyId || undefined,
    projectId: query.projectId || undefined,
    status: query.status || undefined,
    category: query.category || undefined,
  });
  return {
    items: (res.data ?? []).map((row) => toListRow(normalise(row))),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}
