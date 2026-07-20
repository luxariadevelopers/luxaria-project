import {
  StockReorderAlertType,
  type MaterialUnit,
  type StockReorderAlertType as AlertType,
} from './types';

const UNIT_LABELS: Record<MaterialUnit, string> = {
  number: 'number',
  bag: 'bag',
  kilogram: 'kg',
  ton: 'ton',
  litre: 'litre',
  metre: 'm',
  square_foot: 'sq ft',
  cubic_foot: 'cu ft',
  load: 'load',
  box: 'box',
};

/** Human label for Nest `MaterialUnit` (base unit display). */
export function materialUnitLabel(unit: MaterialUnit | string): string {
  if (unit in UNIT_LABELS) {
    return UNIT_LABELS[unit as MaterialUnit];
  }
  return String(unit).replaceAll('_', ' ');
}

export function stockAlertLabel(alert: AlertType | string): string {
  switch (alert) {
    case StockReorderAlertType.BelowReorderLevel:
      return 'Below reorder';
    case StockReorderAlertType.BelowMinimumLevel:
      return 'Below minimum';
    case StockReorderAlertType.ExpectedStockoutWithinDays:
      return 'Stock-out soon';
    case StockReorderAlertType.NoOpenPurchaseOrder:
      return 'No open PO';
    case StockReorderAlertType.ExcessStock:
      return 'Excess';
    case StockReorderAlertType.SlowMovingStock:
      return 'Slow moving';
    default:
      return String(alert).replaceAll('_', ' ');
  }
}
