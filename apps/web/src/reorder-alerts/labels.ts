import {
  AlertSeverity,
  StockReorderAlertStatus,
  StockReorderAlertType,
  type AlertSeverity as Severity,
  type MaterialUnit,
  type StockReorderAlertStatus as Status,
  type StockReorderAlertType as AlertType,
} from './types';

export function reorderAlertTypeLabel(alertType: string): string {
  switch (alertType) {
    case StockReorderAlertType.BelowReorderLevel:
      return 'Below reorder level';
    case StockReorderAlertType.BelowMinimumLevel:
      return 'Below minimum level';
    case StockReorderAlertType.ExpectedStockoutWithinDays:
      return 'Expected stock-out';
    case StockReorderAlertType.NoOpenPurchaseOrder:
      return 'No open purchase order';
    case StockReorderAlertType.ExcessStock:
      return 'Excess stock';
    case StockReorderAlertType.SlowMovingStock:
      return 'Slow-moving stock';
    default:
      return alertType;
  }
}

export function reorderAlertStatusLabel(status: string): string {
  switch (status) {
    case StockReorderAlertStatus.Open:
      return 'Open';
    case StockReorderAlertStatus.Resolved:
      return 'Resolved';
    case StockReorderAlertStatus.Dismissed:
      return 'Dismissed';
    default:
      return status;
  }
}

export function alertSeverityLabel(severity: Severity | string): string {
  switch (severity) {
    case AlertSeverity.Critical:
      return 'Critical';
    case AlertSeverity.High:
      return 'High';
    case AlertSeverity.Medium:
      return 'Medium';
    case AlertSeverity.Low:
      return 'Low';
    default:
      return severity;
  }
}

const UNIT_LABELS: Record<MaterialUnit, string> = {
  number: 'Number',
  bag: 'Bag',
  kilogram: 'Kilogram',
  ton: 'Ton',
  litre: 'Litre',
  metre: 'Metre',
  square_foot: 'Sq ft',
  cubic_foot: 'Cu ft',
  load: 'Load',
  box: 'Box',
};

export function materialUnitLabel(unit: MaterialUnit | string): string {
  if (unit in UNIT_LABELS) {
    return UNIT_LABELS[unit as MaterialUnit];
  }
  return unit;
}

export const REORDER_ALERT_TYPE_OPTIONS: Array<{
  value: AlertType | '';
  label: string;
}> = [
  { value: '', label: 'All alert types' },
  ...Object.values(StockReorderAlertType).map((value) => ({
    value,
    label: reorderAlertTypeLabel(value),
  })),
];

export const REORDER_ALERT_STATUS_OPTIONS: Array<{
  value: Status | '';
  label: string;
}> = [
  { value: '', label: 'All statuses' },
  ...Object.values(StockReorderAlertStatus).map((value) => ({
    value,
    label: reorderAlertStatusLabel(value),
  })),
];
