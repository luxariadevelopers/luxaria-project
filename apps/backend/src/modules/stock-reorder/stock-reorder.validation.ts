import { StockReorderAlertType } from './schemas/stock-reorder-alert.schema';

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function computeAverageDailyConsumption(input: {
  totalConsumedBase: number;
  lookbackDays: number;
}): number {
  const days = Math.max(1, input.lookbackDays);
  return roundQty(Math.max(0, input.totalConsumedBase) / days);
}

export function computeDaysOfCover(input: {
  availableStock: number;
  pendingPoQuantity: number;
  averageDailyConsumption: number;
}): number | null {
  if (input.averageDailyConsumption <= 1e-9) return null;
  const net = Math.max(0, input.availableStock) + Math.max(0, input.pendingPoQuantity);
  return roundQty(net / input.averageDailyConsumption);
}

export function computeEstimatedStockOutDate(input: {
  asOf: Date;
  daysOfCover: number | null;
}): Date | null {
  if (input.daysOfCover === null || !Number.isFinite(input.daysOfCover)) {
    return null;
  }
  if (input.daysOfCover < 0) return new Date(input.asOf);
  const ms = input.asOf.getTime() + input.daysOfCover * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

/**
 * Bring net available up to maximumStock when set; otherwise up to reorderLevel.
 */
export function computeRecommendedPurchaseQuantity(input: {
  availableStock: number;
  pendingPoQuantity: number;
  reorderLevel: number;
  maximumStock: number;
}): number {
  const net =
    Math.max(0, input.availableStock) + Math.max(0, input.pendingPoQuantity);
  const target =
    input.maximumStock > 0
      ? input.maximumStock
      : Math.max(0, input.reorderLevel);
  return roundQty(Math.max(0, target - net));
}

export type ForecastMetrics = {
  availableStock: number;
  pendingPoQuantity: number;
  averageDailyConsumption: number;
  daysOfCover: number | null;
  estimatedStockOutDate: Date | null;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  recommendedPurchaseQuantity: number;
  hasOpenPurchaseOrder: boolean;
  lookbackDays: number;
};

export function evaluateForecastAlerts(input: {
  metrics: ForecastMetrics;
  stockoutAlertDays: number;
  slowMovingDays: number;
  asOf: Date;
}): Array<{ alertType: StockReorderAlertType; message: string }> {
  const m = input.metrics;
  const alerts: Array<{ alertType: StockReorderAlertType; message: string }> =
    [];

  if (m.reorderLevel > 0 && m.availableStock + 1e-9 < m.reorderLevel) {
    alerts.push({
      alertType: StockReorderAlertType.BelowReorderLevel,
      message: `Available stock ${m.availableStock} is below reorder level ${m.reorderLevel}`,
    });
  }

  if (m.minimumStock > 0 && m.availableStock + 1e-9 < m.minimumStock) {
    alerts.push({
      alertType: StockReorderAlertType.BelowMinimumLevel,
      message: `Available stock ${m.availableStock} is below minimum level ${m.minimumStock}`,
    });
  }

  if (
    m.daysOfCover !== null &&
    m.daysOfCover <= input.stockoutAlertDays
  ) {
    alerts.push({
      alertType: StockReorderAlertType.ExpectedStockoutWithinDays,
      message: `Estimated stock-out in ${m.daysOfCover} day(s) (threshold ${input.stockoutAlertDays})`,
    });
  }

  const needsReplenishment =
    (m.reorderLevel > 0 && m.availableStock < m.reorderLevel) ||
    (m.daysOfCover !== null && m.daysOfCover <= input.stockoutAlertDays);

  if (needsReplenishment && !m.hasOpenPurchaseOrder) {
    alerts.push({
      alertType: StockReorderAlertType.NoOpenPurchaseOrder,
      message:
        'Stock needs replenishment but there is no open purchase order',
    });
  }

  if (m.maximumStock > 0 && m.availableStock - m.maximumStock > 1e-9) {
    alerts.push({
      alertType: StockReorderAlertType.ExcessStock,
      message: `Available stock ${m.availableStock} exceeds maximum ${m.maximumStock}`,
    });
  }

  const coverOnHand =
    m.averageDailyConsumption > 1e-9
      ? m.availableStock / m.averageDailyConsumption
      : null;
  const noMovement =
    m.availableStock > 1e-9 && m.averageDailyConsumption <= 1e-9;
  const highCover =
    coverOnHand !== null && coverOnHand >= input.slowMovingDays;

  if (noMovement || highCover) {
    alerts.push({
      alertType: StockReorderAlertType.SlowMovingStock,
      message: highCover
        ? `On-hand cover ≈ ${roundQty(coverOnHand!)} days (≥ ${input.slowMovingDays})`
        : `No consumption in the last ${m.lookbackDays} days while stock remains`,
    });
  }

  return alerts;
}
