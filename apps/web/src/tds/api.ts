import { apiGet } from '@/api/client';
import type {
  ListTdsDeductionsQuery,
  ListTdsReturnsQuery,
  PaginatedTdsDeductions,
  PaginatedTdsReturns,
  PublicTdsDeduction,
  PublicTdsReturn,
  TdsDeductionListRow,
  TdsReturnListRow,
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
): PaginatedTdsDeductions['meta'] {
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

function normaliseDeduction(row: PublicTdsDeduction): PublicTdsDeduction {
  return {
    ...row,
    transactionDate: toIso(row.transactionDate) ?? '',
    createdAt: toIso(row.createdAt),
  };
}

function normaliseReturn(row: PublicTdsReturn): PublicTdsReturn {
  return {
    ...row,
    filedAt: toIsoOrNull(row.filedAt),
    createdAt: toIso(row.createdAt),
  };
}

function toDeductionListRow(row: PublicTdsDeduction): TdsDeductionListRow {
  return {
    id: row.id,
    deductionNumber: row.deductionNumber,
    sectionCode: row.sectionCode,
    partyName: row.partyName,
    transactionDate: row.transactionDate,
    transactionAmount: row.transactionAmount,
    tdsAmount: row.tdsAmount,
    status: row.status,
    projectId: row.projectId,
  };
}

function toReturnListRow(row: PublicTdsReturn): TdsReturnListRow {
  return {
    id: row.id,
    returnNumber: row.returnNumber,
    formType: row.formType,
    quarter: row.quarter,
    financialYearLabel: row.financialYearLabel,
    status: row.status,
    totalDeductees: row.totalDeductees,
    totalTds: row.totalTds,
    filedAt: row.filedAt,
  };
}

/** `GET /tds/deductions` — `tds.view` */
export async function fetchTdsDeductions(
  query: ListTdsDeductionsQuery = {},
): Promise<PaginatedTdsDeductions> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicTdsDeduction[]>('/tds/deductions', {
    page,
    limit,
    companyId: query.companyId || undefined,
    projectId: query.projectId || undefined,
    sectionCode: query.sectionCode || undefined,
    status: query.status || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
  });
  return {
    items: (res.data ?? []).map((row) =>
      toDeductionListRow(normaliseDeduction(row)),
    ),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /tds/returns` — `tds.view` */
export async function fetchTdsReturns(
  query: ListTdsReturnsQuery = {},
): Promise<PaginatedTdsReturns> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicTdsReturn[]>('/tds/returns', {
    page,
    limit,
    companyId: query.companyId || undefined,
    formType: query.formType || undefined,
    quarter: query.quarter || undefined,
    financialYearLabel: query.financialYearLabel || undefined,
    status: query.status || undefined,
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
