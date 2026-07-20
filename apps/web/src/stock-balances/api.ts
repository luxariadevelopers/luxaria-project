import { apiGet } from '@/api/client';
import type {
  ForecastQuery,
  PublicStockBalance,
  PublicStockForecast,
  StockBalanceQuery,
  StockBalanceRow,
  StockReorderAlertType,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
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

function normaliseBalance(row: PublicStockBalance): PublicStockBalance {
  return {
    ...row,
    id: row.id == null ? null : String(row.id),
    materialId: String(row.materialId),
    projectId: String(row.projectId),
    location: row.location ?? '',
    quantityInBaseUnit: Number(row.quantityInBaseUnit ?? 0),
    version: Number(row.version ?? 0),
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

/** `GET /stock-reorder/forecast` — `stock.view` (project material availability). */
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

/** `GET /stock-ledger/balance` — `stock.view` (location-scoped on-hand). */
export async function fetchStockBalance(
  query: StockBalanceQuery,
): Promise<PublicStockBalance> {
  const res = await apiGet<PublicStockBalance>('/stock-ledger/balance', {
    projectId: query.projectId,
    materialId: query.materialId,
    location: query.location || undefined,
  });
  if (!res.data) {
    throw new Error('Stock balance response missing data');
  }
  return normaliseBalance(res.data);
}

export function forecastToStockRows(
  forecasts: readonly PublicStockForecast[],
): StockBalanceRow[] {
  return forecasts.map((f) => ({
    projectId: f.projectId,
    materialId: f.materialId,
    materialCode: f.materialCode,
    materialName: f.materialName,
    quantityInBaseUnit: f.availableStock,
    baseUnit: f.baseUnit,
    location: '',
    reorderLevel: f.reorderLevel,
    minimumStock: f.minimumStock,
    maximumStock: f.maximumStock,
    pendingPoQuantity: f.pendingPoQuantity,
    alerts: f.alerts,
  }));
}

/**
 * Merge forecast metadata with location-scoped balance quantities.
 * Does not expose ledger entry lines.
 */
export async function fetchLocationScopedStockRows(input: {
  projectId: string;
  location: string;
  forecasts: readonly PublicStockForecast[];
}): Promise<StockBalanceRow[]> {
  const location = input.location.trim();
  const balances = await Promise.all(
    input.forecasts.map((f) =>
      fetchStockBalance({
        projectId: input.projectId,
        materialId: f.materialId,
        location,
      }),
    ),
  );

  return input.forecasts.map((f, i) => {
    const bal = balances[i]!;
    return {
      projectId: input.projectId,
      materialId: f.materialId,
      materialCode: f.materialCode,
      materialName: f.materialName,
      quantityInBaseUnit: bal.quantityInBaseUnit,
      baseUnit: bal.baseUnit || f.baseUnit,
      location,
      reorderLevel: f.reorderLevel,
      minimumStock: f.minimumStock,
      maximumStock: f.maximumStock,
      pendingPoQuantity: f.pendingPoQuantity,
      alerts: f.alerts,
    };
  });
}
