import { StockTransactionType } from './types';

export function stockTransactionTypeLabel(type: string): string {
  switch (type) {
    case StockTransactionType.OpeningStock:
      return 'Opening stock';
    case StockTransactionType.PurchaseReceipt:
      return 'Purchase receipt';
    case StockTransactionType.TransferIn:
      return 'Transfer in';
    case StockTransactionType.TransferOut:
      return 'Transfer out';
    case StockTransactionType.MaterialIssue:
      return 'Material issue';
    case StockTransactionType.ReturnFromWork:
      return 'Return from work';
    case StockTransactionType.ReturnToVendor:
      return 'Return to vendor';
    case StockTransactionType.Wastage:
      return 'Wastage';
    case StockTransactionType.Damage:
      return 'Damage';
    case StockTransactionType.TheftOrShortage:
      return 'Theft / shortage';
    case StockTransactionType.Adjustment:
      return 'Adjustment';
    case StockTransactionType.Reversal:
      return 'Reversal';
    default:
      return type;
  }
}

export const STOCK_TRANSACTION_TYPE_OPTIONS = Object.values(
  StockTransactionType,
);

export function materialUnitLabel(unit: string): string {
  return unit.replace(/_/g, ' ');
}
