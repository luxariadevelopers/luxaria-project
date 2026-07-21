import { apiGet } from '@/api/client';
import type {
  GstDocumentListRow,
  GstReturnListRow,
  ListGstDocumentsQuery,
  ListGstReturnsQuery,
  PaginatedGstDocuments,
  PaginatedGstReturns,
  PublicGstDocument,
  PublicGstReturn,
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

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedGstDocuments['meta'] {
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

function normaliseDocument(row: PublicGstDocument): PublicGstDocument {
  return {
    ...row,
    documentDate: toIso(row.documentDate) ?? '',
    createdAt: toIso(row.createdAt),
  };
}

function normaliseReturn(row: PublicGstReturn): PublicGstReturn {
  return {
    ...row,
    filedAt: toIsoOrNull(row.filedAt),
    createdAt: toIso(row.createdAt),
  };
}

function toDocumentListRow(row: PublicGstDocument): GstDocumentListRow {
  return {
    id: row.id,
    documentNumber: row.documentNumber,
    documentType: row.documentType,
    direction: row.direction,
    partyName: row.partyName,
    documentDate: row.documentDate,
    taxableValue: row.taxableValue,
    totalValue: row.totalValue,
    status: row.status,
    projectId: row.projectId,
  };
}

function toReturnListRow(row: PublicGstReturn): GstReturnListRow {
  return {
    id: row.id,
    returnNumber: row.returnNumber,
    returnType: row.returnType,
    periodMonth: row.periodMonth,
    periodYear: row.periodYear,
    status: row.status,
    taxPayable: row.taxPayable,
    itcAvailable: row.itcAvailable,
    filedAt: row.filedAt,
  };
}

/** `GET /gst/documents` — `gst.view` */
export async function fetchGstDocuments(
  query: ListGstDocumentsQuery = {},
): Promise<PaginatedGstDocuments> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicGstDocument[]>('/gst/documents', {
    page,
    limit,
    companyId: query.companyId || undefined,
    projectId: query.projectId || undefined,
    direction: query.direction || undefined,
    status: query.status || undefined,
    documentType: query.documentType || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
  });
  return {
    items: (res.data ?? []).map((row) =>
      toDocumentListRow(normaliseDocument(row)),
    ),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /gst/returns` — `gst.view` */
export async function fetchGstReturns(
  query: ListGstReturnsQuery = {},
): Promise<PaginatedGstReturns> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicGstReturn[]>('/gst/returns', {
    page,
    limit,
    companyId: query.companyId || undefined,
    returnType: query.returnType || undefined,
    periodMonth: query.periodMonth ?? undefined,
    periodYear: query.periodYear ?? undefined,
  });
  return {
    items: (res.data ?? []).map((row) => toReturnListRow(normaliseReturn(row))),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}
