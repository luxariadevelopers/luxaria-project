import { StockReorderAlertType, type StockBalanceRow } from './types';

const LOW_STOCK_ALERTS = new Set<string>([
  StockReorderAlertType.BelowReorderLevel,
  StockReorderAlertType.BelowMinimumLevel,
]);

/**
 * Low-stock when Nest forecast alerts fire, or on-hand is below
 * reorder / minimum levels (also covers location-scoped qty).
 */
export function isLowStock(
  row: Pick<
    StockBalanceRow,
    'quantityInBaseUnit' | 'reorderLevel' | 'minimumStock' | 'alerts'
  >,
): boolean {
  if (row.alerts.some((a) => LOW_STOCK_ALERTS.has(a))) {
    return true;
  }
  if (row.reorderLevel > 0 && row.quantityInBaseUnit + 1e-9 < row.reorderLevel) {
    return true;
  }
  if (row.minimumStock > 0 && row.quantityInBaseUnit + 1e-9 < row.minimumStock) {
    return true;
  }
  return false;
}

export function lowStockReason(
  row: Pick<
    StockBalanceRow,
    'quantityInBaseUnit' | 'reorderLevel' | 'minimumStock' | 'alerts'
  >,
): string | null {
  if (!isLowStock(row)) return null;
  if (
    row.alerts.includes(StockReorderAlertType.BelowMinimumLevel) ||
    (row.minimumStock > 0 && row.quantityInBaseUnit + 1e-9 < row.minimumStock)
  ) {
    return `Below minimum (${row.minimumStock})`;
  }
  if (
    row.alerts.includes(StockReorderAlertType.BelowReorderLevel) ||
    (row.reorderLevel > 0 && row.quantityInBaseUnit + 1e-9 < row.reorderLevel)
  ) {
    return `Below reorder (${row.reorderLevel})`;
  }
  return 'Low stock';
}
