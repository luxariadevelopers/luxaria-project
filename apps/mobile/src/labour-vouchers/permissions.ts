/**
 * Nest catalog permissions for signed payment / labour vouchers.
 * Spec aliases `labour_voucher.create/submit` map to `payment.release`.
 */
export const LABOUR_VOUCHER_PERMISSIONS = {
  view: 'payment.view',
  createOrSubmit: 'payment.release',
  /** Needed to list petty-cash accounts for payment mode. */
  viewCash: 'cash.view',
  /** Needed to upload signature / photo documents. */
  uploadDocument: 'document.upload',
  /** Needed to open generated voucher PDF after approval. */
  downloadDocument: 'document.download',
} as const;
