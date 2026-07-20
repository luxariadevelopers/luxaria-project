/**
 * Mirrors Nest `PublicStockReorderAlert` /
 * `apps/backend/src/modules/stock-reorder/stock-reorder.mapper.ts`.
 */

/** Nest `MaterialUnit` */
export type MaterialUnit =
  | 'number'
  | 'bag'
  | 'kilogram'
  | 'ton'
  | 'litre'
  | 'metre'
  | 'square_foot'
  | 'cubic_foot'
  | 'load'
  | 'box';

/** Nest `StockReorderAlertType` */
export const StockReorderAlertType = {
  BelowReorderLevel: 'below_reorder_level',
  BelowMinimumLevel: 'below_minimum_level',
  ExpectedStockoutWithinDays: 'expected_stockout_within_days',
  NoOpenPurchaseOrder: 'no_open_purchase_order',
  ExcessStock: 'excess_stock',
  SlowMovingStock: 'slow_moving_stock',
} as const;

export type StockReorderAlertType =
  (typeof StockReorderAlertType)[keyof typeof StockReorderAlertType];

/** Nest `StockReorderAlertStatus` */
export const StockReorderAlertStatus = {
  Open: 'open',
  Resolved: 'resolved',
  Dismissed: 'dismissed',
} as const;

export type StockReorderAlertStatus =
  (typeof StockReorderAlertStatus)[keyof typeof StockReorderAlertStatus];

/** Alert severity for purchase action priority (client UX). */
export const AlertSeverity = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const;

export type AlertSeverity =
  (typeof AlertSeverity)[keyof typeof AlertSeverity];

export type PublicStockReorderAlert = {
  id: string;
  projectId: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  alertType: StockReorderAlertType;
  status: StockReorderAlertStatus;
  message: string;
  availableStock: number;
  pendingPoQuantity: number;
  averageDailyConsumption: number;
  estimatedStockOutDate: string | null;
  reorderLevel: number;
  recommendedPurchaseQuantity: number;
  baseUnit: MaterialUnit;
  evaluatedAt: string;
  jobId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** `GET /stock-reorder/forecast` — used for assumptions / live metrics. */
export type PublicStockForecast = {
  projectId: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: MaterialUnit;
  availableStock: number;
  pendingPoQuantity: number;
  averageDailyConsumption: number;
  daysOfCover: number | null;
  estimatedStockOutDate: string | null;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  recommendedPurchaseQuantity: number;
  hasOpenPurchaseOrder: boolean;
  lookbackDays: number;
  alerts: StockReorderAlertType[];
};

export type ListReorderAlertsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  materialId?: string;
  alertType?: StockReorderAlertType;
  status?: StockReorderAlertStatus;
};

export type PaginatedReorderAlerts = {
  items: PublicStockReorderAlert[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type ForecastQuery = {
  projectId: string;
  materialId?: string;
  lookbackDays?: number;
};

export type EvaluateReorderInput = {
  projectId?: string;
  materialId?: string;
  lookbackDays?: number;
  asOf?: string;
};

/** Nest evaluate outcome (queued or inline). */
export type EvaluateReorderOutcome = {
  mode: 'queued' | 'inline' | string;
  jobId?: string | null;
  [key: string]: unknown;
};

/**
 * Documented Nest defaults from `STOCK_REORDER_API.md` /
 * `configuration.ts` (shown in UI assumptions banner).
 */
export const FORECAST_ASSUMPTIONS = {
  defaultLookbackDays: 30,
  defaultStockoutAlertDays: 3,
  defaultSlowMovingDays: 45,
} as const;
