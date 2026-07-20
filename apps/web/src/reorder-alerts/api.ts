import { apiGet, apiPost } from '@/api/client';
import type {
  EvaluateReorderInput,
  EvaluateReorderOutcome,
  ForecastQuery,
  ListReorderAlertsQuery,
  PaginatedReorderAlerts,
  PublicStockForecast,
  PublicStockReorderAlert,
  StockReorderAlertType,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseAlert(
  row: PublicStockReorderAlert,
): PublicStockReorderAlert {
  return {
    ...row,
    projectId: String(row.projectId),
    materialId: String(row.materialId),
    materialCode: row.materialCode ?? null,
    materialName: row.materialName ?? null,
    message: row.message ?? '',
    availableStock: Number(row.availableStock ?? 0),
    pendingPoQuantity: Number(row.pendingPoQuantity ?? 0),
    averageDailyConsumption: Number(row.averageDailyConsumption ?? 0),
    estimatedStockOutDate: toIso(row.estimatedStockOutDate),
    reorderLevel: Number(row.reorderLevel ?? 0),
    recommendedPurchaseQuantity: Number(
      row.recommendedPurchaseQuantity ?? 0,
    ),
    evaluatedAt: toIso(row.evaluatedAt) ?? String(row.evaluatedAt),
    jobId: row.jobId ?? null,
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function normaliseForecast(row: PublicStockForecast): PublicStockForecast {
  return {
    ...row,
    projectId: String(row.projectId),
    materialId: String(row.materialId),
    materialCode: row.materialCode ?? null,
    materialName: row.materialName ?? null,
    availableStock: Number(row.availableStock ?? 0),
    pendingPoQuantity: Number(row.pendingPoQuantity ?? 0),
    averageDailyConsumption: Number(row.averageDailyConsumption ?? 0),
    daysOfCover:
      row.daysOfCover == null ? null : Number(row.daysOfCover),
    estimatedStockOutDate: toIso(row.estimatedStockOutDate),
    reorderLevel: Number(row.reorderLevel ?? 0),
    minimumStock: Number(row.minimumStock ?? 0),
    maximumStock: Number(row.maximumStock ?? 0),
    recommendedPurchaseQuantity: Number(
      row.recommendedPurchaseQuantity ?? 0,
    ),
    hasOpenPurchaseOrder: Boolean(row.hasOpenPurchaseOrder),
    lookbackDays: Number(row.lookbackDays ?? 0),
    alerts: Array.isArray(row.alerts)
      ? (row.alerts as StockReorderAlertType[])
      : [],
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedReorderAlerts['meta'] {
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

/** `GET /stock-reorder/alerts` — `stock.view` */
export async function fetchReorderAlerts(
  query: ListReorderAlertsQuery = {},
): Promise<PaginatedReorderAlerts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicStockReorderAlert[]>(
    '/stock-reorder/alerts',
    {
      page,
      limit,
      projectId: query.projectId,
      materialId: query.materialId,
      alertType: query.alertType,
      status: query.status,
    },
  );
  return {
    items: (res.data ?? []).map(normaliseAlert),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /stock-reorder/forecast` — `stock.view` */
export async function fetchStockForecast(
  query: ForecastQuery,
): Promise<PublicStockForecast[]> {
  const res = await apiGet<PublicStockForecast[]>('/stock-reorder/forecast', {
    projectId: query.projectId,
    materialId: query.materialId,
    lookbackDays: query.lookbackDays,
  });
  return (res.data ?? []).map(normaliseForecast);
}

/** `POST /stock-reorder/evaluate` — `stock.adjust` */
export async function evaluateStockReorder(
  input: EvaluateReorderInput = {},
): Promise<EvaluateReorderOutcome> {
  const res = await apiPost<EvaluateReorderOutcome>(
    '/stock-reorder/evaluate',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Stock reorder evaluation failed');
  }
  return res.data;
}
