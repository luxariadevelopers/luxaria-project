import { mergeStockCountItemPhotos } from '@/stock-count/mergeItemPhotos';

const SUBMIT_AFTER_TYPES = new Set([
  'stock_count.create_submit',
  'site_expense.create',
  'purchase_request.create',
]);

/** True when sync should POST create then call a module submit endpoint. */
export function wantsSubmitAfterCreate(
  txnType: string,
  payload: Record<string, unknown>,
): boolean {
  if (txnType === 'stock_count.create_submit') return true;
  return SUBMIT_AFTER_TYPES.has(txnType) && payload.submitAfterCreate === true;
}

/** Strip offline-only flags before Nest create body. */
export function prepareCreateBody(
  txnType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (
    txnType === 'stock_count.create_submit' ||
    txnType.startsWith('stock_count')
  ) {
    return mergeStockCountItemPhotos(payload);
  }
  const { submitAfterCreate: _s, offlineCapturedAt: _o, ...rest } = payload;
  return rest;
}

export function submitAfterCreatePath(
  txnType: string,
  recordId: string,
): string | null {
  const id = encodeURIComponent(recordId);
  switch (txnType) {
    case 'stock_count.create_submit':
      return `/stock-counts/${id}/submit`;
    case 'site_expense.create':
      return `/site-expense-vouchers/${id}/submit`;
    case 'purchase_request.create':
      return `/purchase-requests/${id}/submit`;
    default:
      return null;
  }
}
