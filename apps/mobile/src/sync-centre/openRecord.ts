import type { OfflineTransaction } from '@/offline/types';

export type OpenRecordTarget = {
  screen: 'GoodsReceipt' | 'DailyProgressReport';
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
    default:
      return null;
  }
}
