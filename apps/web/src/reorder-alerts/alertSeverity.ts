import {
  AlertSeverity,
  StockReorderAlertType,
  type AlertSeverity as Severity,
  type StockReorderAlertType as AlertType,
} from './types';

/**
 * Maps Nest alert types to purchase-action severity.
 * Critical / high alerts are stock-out risks; low covers excess / slow-moving.
 */
export function alertSeverity(alertType: AlertType | string): Severity {
  switch (alertType) {
    case StockReorderAlertType.BelowMinimumLevel:
      return AlertSeverity.Critical;
    case StockReorderAlertType.ExpectedStockoutWithinDays:
      return AlertSeverity.Critical;
    case StockReorderAlertType.BelowReorderLevel:
      return AlertSeverity.High;
    case StockReorderAlertType.NoOpenPurchaseOrder:
      return AlertSeverity.High;
    case StockReorderAlertType.SlowMovingStock:
      return AlertSeverity.Medium;
    case StockReorderAlertType.ExcessStock:
      return AlertSeverity.Low;
    default:
      return AlertSeverity.Medium;
  }
}

export function alertSeverityRank(severity: Severity): number {
  switch (severity) {
    case AlertSeverity.Critical:
      return 4;
    case AlertSeverity.High:
      return 3;
    case AlertSeverity.Medium:
      return 2;
    case AlertSeverity.Low:
      return 1;
    default:
      return 0;
  }
}

/** Sort alerts so critical stock-out risks surface first. */
export function compareAlertsBySeverity(
  a: { alertType: string },
  b: { alertType: string },
): number {
  return (
    alertSeverityRank(alertSeverity(b.alertType)) -
    alertSeverityRank(alertSeverity(a.alertType))
  );
}
