import {
  StockReservationSourceType,
  StockReservationStatus,
} from './types';

export function stockReservationStatusLabel(status: string): string {
  switch (status) {
    case StockReservationStatus.Active:
      return 'Active';
    case StockReservationStatus.Released:
      return 'Released';
    case StockReservationStatus.Consumed:
      return 'Consumed';
    case StockReservationStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function stockReservationSourceLabel(sourceType: string): string {
  switch (sourceType) {
    case StockReservationSourceType.Dpr:
      return 'DPR';
    case StockReservationSourceType.Contractor:
      return 'Contractor';
    case StockReservationSourceType.Labour:
      return 'Labour';
    case StockReservationSourceType.Equipment:
      return 'Equipment';
    case StockReservationSourceType.PurchaseOrder:
      return 'Purchase order';
    case StockReservationSourceType.MaterialRequest:
      return 'Material request';
    case StockReservationSourceType.Manual:
      return 'Manual';
    default:
      return sourceType.replace(/_/g, ' ');
  }
}

export const STOCK_RESERVATION_STATUS_OPTIONS = Object.values(
  StockReservationStatus,
);

export const STOCK_RESERVATION_SOURCE_OPTIONS = Object.values(
  StockReservationSourceType,
);

export function materialUnitLabel(unit: string): string {
  return unit.replace(/_/g, ' ');
}
