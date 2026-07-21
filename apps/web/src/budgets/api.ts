import { apiGet } from '@/api/client';
import type {
  BudgetListRow,
  ListBudgetsQuery,
  PaginatedBudgets,
  PublicBudget,
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
): PaginatedBudgets['meta'] {
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

function toListRow(row: PublicBudget): BudgetListRow {
  return {
    id: row.id,
    budgetNumber: row.budgetNumber,
    name: row.name,
    financialYearId: row.financialYearId,
    projectId: row.projectId,
    version: row.version,
    status: row.status,
    totalAmount: row.totalAmount,
    createdAt: row.createdAt,
  };
}

function normalise(row: PublicBudget): PublicBudget {
  return {
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** `GET /budgets` — `budget.view` */
export async function fetchBudgets(
  query: ListBudgetsQuery = {},
): Promise<PaginatedBudgets> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicBudget[]>('/budgets', {
    page,
    limit,
    companyId: query.companyId || undefined,
    projectId: query.projectId || undefined,
    financialYearId: query.financialYearId || undefined,
    status: query.status || undefined,
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
