import { StockReorderAlertType } from './schemas/stock-reorder-alert.schema';
import {
  computeAverageDailyConsumption,
  computeDaysOfCover,
  computeEstimatedStockOutDate,
  computeRecommendedPurchaseQuantity,
  evaluateForecastAlerts,
  type ForecastMetrics,
} from './stock-reorder.validation';

function metrics(partial: Partial<ForecastMetrics>): ForecastMetrics {
  return {
    availableStock: 0,
    pendingPoQuantity: 0,
    averageDailyConsumption: 0,
    daysOfCover: null,
    estimatedStockOutDate: null,
    reorderLevel: 0,
    minimumStock: 0,
    maximumStock: 0,
    recommendedPurchaseQuantity: 0,
    hasOpenPurchaseOrder: false,
    lookbackDays: 30,
    ...partial,
  };
}

describe('stock-reorder.validation', () => {
  it('computes average daily consumption', () => {
    expect(
      computeAverageDailyConsumption({ totalConsumedBase: 30, lookbackDays: 30 }),
    ).toBe(1);
  });

  it('computes days of cover and stock-out date', () => {
    const days = computeDaysOfCover({
      availableStock: 10,
      pendingPoQuantity: 5,
      averageDailyConsumption: 5,
    });
    expect(days).toBe(3);

    const asOf = new Date('2026-07-17T00:00:00.000Z');
    const stockOut = computeEstimatedStockOutDate({ asOf, daysOfCover: days });
    expect(stockOut?.toISOString()).toBe('2026-07-20T00:00:00.000Z');
  });

  it('recommends purchase up to maximum then reorder level', () => {
    expect(
      computeRecommendedPurchaseQuantity({
        availableStock: 20,
        pendingPoQuantity: 10,
        reorderLevel: 50,
        maximumStock: 100,
      }),
    ).toBe(70);

    expect(
      computeRecommendedPurchaseQuantity({
        availableStock: 40,
        pendingPoQuantity: 0,
        reorderLevel: 50,
        maximumStock: 0,
      }),
    ).toBe(10);
  });

  it('raises all expected alert types', () => {
    const asOf = new Date('2026-07-17T00:00:00.000Z');
    const alerts = evaluateForecastAlerts({
      asOf,
      stockoutAlertDays: 3,
      slowMovingDays: 45,
      metrics: metrics({
        availableStock: 5,
        pendingPoQuantity: 0,
        averageDailyConsumption: 5,
        daysOfCover: 1,
        estimatedStockOutDate: new Date('2026-07-18T00:00:00.000Z'),
        reorderLevel: 50,
        minimumStock: 20,
        maximumStock: 200,
        hasOpenPurchaseOrder: false,
        lookbackDays: 30,
      }),
    });

    const types = alerts.map((a) => a.alertType);
    expect(types).toContain(StockReorderAlertType.BelowReorderLevel);
    expect(types).toContain(StockReorderAlertType.BelowMinimumLevel);
    expect(types).toContain(StockReorderAlertType.ExpectedStockoutWithinDays);
    expect(types).toContain(StockReorderAlertType.NoOpenPurchaseOrder);
  });

  it('flags excess and slow-moving stock', () => {
    const excess = evaluateForecastAlerts({
      asOf: new Date(),
      stockoutAlertDays: 3,
      slowMovingDays: 45,
      metrics: metrics({
        availableStock: 250,
        maximumStock: 200,
        averageDailyConsumption: 1,
        daysOfCover: 250,
        lookbackDays: 30,
      }),
    });
    expect(excess.map((a) => a.alertType)).toContain(
      StockReorderAlertType.ExcessStock,
    );
    expect(excess.map((a) => a.alertType)).toContain(
      StockReorderAlertType.SlowMovingStock,
    );

    const idle = evaluateForecastAlerts({
      asOf: new Date(),
      stockoutAlertDays: 3,
      slowMovingDays: 45,
      metrics: metrics({
        availableStock: 40,
        averageDailyConsumption: 0,
        daysOfCover: null,
        lookbackDays: 30,
      }),
    });
    expect(idle.map((a) => a.alertType)).toContain(
      StockReorderAlertType.SlowMovingStock,
    );
  });
});
