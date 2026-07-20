import { StockCountStatus } from './types';

export function stockCountStatusLabel(status: string): string {
  switch (status) {
    case StockCountStatus.Draft:
      return 'Draft';
    case StockCountStatus.Submitted:
      return 'Submitted';
    case StockCountStatus.Reviewed:
      return 'Reviewed';
    case StockCountStatus.Approved:
      return 'Approved';
    case StockCountStatus.AdjustmentPosted:
      return 'Adjustment posted';
    case StockCountStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export const STOCK_COUNT_STATUS_OPTIONS = Object.values(StockCountStatus);

export function materialUnitLabel(unit: string): string {
  return unit.replace(/_/g, ' ');
}
