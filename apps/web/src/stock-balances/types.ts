/** Nest `MaterialUnit` — stock quantities are always in base unit. */
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

/** Nest `StockReorderAlertType` — used for low-stock indicators. */
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

/** `GET /stock-reorder/forecast` — PublicStockForecast */
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

/** `GET /stock-ledger/balance` — PublicStockBalance */
export type PublicStockBalance = {
  id: string | null;
  materialId: string;
  projectId: string;
  location: string;
  quantityInBaseUnit: number;
  baseUnit: MaterialUnit;
  version: number;
  updatedAt?: string;
};

export type ForecastQuery = {
  projectId: string;
  materialId?: string;
  lookbackDays?: number;
};

export type StockBalanceQuery = {
  projectId: string;
  materialId: string;
  location?: string;
};

/**
 * Table row — on-hand availability only (never raw ledger lines).
 * `quantityInBaseUnit` is always in `baseUnit`; never treat as a display/alternate unit.
 */
export type StockBalanceRow = {
  projectId: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantityInBaseUnit: number;
  baseUnit: MaterialUnit;
  /** Empty string = all locations (forecast aggregate); otherwise Nest location key. */
  location: string;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  pendingPoQuantity: number;
  alerts: readonly StockReorderAlertType[];
};

export type StockBalanceFilterState = {
  /** Nest balance `location` (max 120). Empty = all locations. */
  location: string;
  /** Client search on material code / name. */
  search: string;
  lowStockOnly: boolean;
};
