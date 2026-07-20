import { describe, expect, it } from 'vitest';
import {
  alertSeverity,
  alertSeverityRank,
  compareAlertsBySeverity,
} from './alertSeverity';
import { AlertSeverity, StockReorderAlertType } from './types';

describe('alertSeverity', () => {
  it('marks below minimum and expected stock-out as critical', () => {
    expect(alertSeverity(StockReorderAlertType.BelowMinimumLevel)).toBe(
      AlertSeverity.Critical,
    );
    expect(
      alertSeverity(StockReorderAlertType.ExpectedStockoutWithinDays),
    ).toBe(AlertSeverity.Critical);
  });

  it('marks reorder-level and no open PO as high', () => {
    expect(alertSeverity(StockReorderAlertType.BelowReorderLevel)).toBe(
      AlertSeverity.High,
    );
    expect(alertSeverity(StockReorderAlertType.NoOpenPurchaseOrder)).toBe(
      AlertSeverity.High,
    );
  });

  it('marks slow-moving as medium and excess as low', () => {
    expect(alertSeverity(StockReorderAlertType.SlowMovingStock)).toBe(
      AlertSeverity.Medium,
    );
    expect(alertSeverity(StockReorderAlertType.ExcessStock)).toBe(
      AlertSeverity.Low,
    );
  });

  it('ranks critical above high', () => {
    expect(alertSeverityRank(AlertSeverity.Critical)).toBeGreaterThan(
      alertSeverityRank(AlertSeverity.High),
    );
  });

  it('sorts alerts by severity descending', () => {
    const rows = [
      { alertType: StockReorderAlertType.ExcessStock },
      { alertType: StockReorderAlertType.BelowMinimumLevel },
      { alertType: StockReorderAlertType.BelowReorderLevel },
    ];
    const sorted = [...rows].sort(compareAlertsBySeverity);
    expect(sorted[0]?.alertType).toBe(
      StockReorderAlertType.BelowMinimumLevel,
    );
    expect(sorted[1]?.alertType).toBe(
      StockReorderAlertType.BelowReorderLevel,
    );
    expect(sorted[2]?.alertType).toBe(StockReorderAlertType.ExcessStock);
  });
});
