import { getDomainStatusLabel } from '@/status';
import { GoodsReceiptStatus } from './types';

export function grnStatusLabel(status: string): string {
  return getDomainStatusLabel('goodsReceipt', status, status);
}

export const GRN_STATUS_OPTIONS = Object.values(GoodsReceiptStatus);
