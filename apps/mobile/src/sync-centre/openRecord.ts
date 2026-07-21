import type { OfflineTransaction } from '@/offline/types';

export type OpenRecordTarget = {
  screen:
    | 'GoodsReceipt'
    | 'DailyProgressReport'
    | 'SiteExpenseForm'
    | 'PurchaseRequestForm';
  label: string;
};

/**
 * Maps queued offline types to existing mobile capture screens.
 * No invented deep links — only screens already in the navigator.
 */
export function resolveOpenRecord(
  txn: OfflineTransaction,
): OpenRecordTarget | null {
  switch (txn.type) {
    case 'grn.create':
    case 'goods_receipt':
      return { screen: 'GoodsReceipt', label: 'Open goods receipt form' };
    case 'dpr.create':
    case 'daily_progress_report':
      return {
        screen: 'DailyProgressReport',
        label: 'Open daily progress form',
      };
    case 'site_expense.create':
      return { screen: 'SiteExpenseForm', label: 'Open site expense form' };
    case 'purchase_request.create':
      return {
        screen: 'PurchaseRequestForm',
        label: 'Open purchase request form',
      };
    default:
      return null;
  }
}
