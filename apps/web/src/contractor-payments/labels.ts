import type { ContractorPaymentMode, ContractorPaymentStatus } from './types';

const STATUS_LABELS: Record<ContractorPaymentStatus, string> = {
  draft: 'Draft',
  approval: 'Approval',
  released: 'Released',
  verified: 'Verified',
  posted: 'Posted',
  cancelled: 'Cancelled',
};

export function paymentStatusLabel(status: string): string {
  return STATUS_LABELS[status as ContractorPaymentStatus] ?? status;
}

const MODE_LABELS: Record<ContractorPaymentMode, string> = {
  bank_transfer: 'Bank transfer',
  neft: 'NEFT',
  rtgs: 'RTGS',
  imps: 'IMPS',
  upi: 'UPI',
  cheque: 'Cheque',
  other: 'Other',
};

export function paymentModeLabel(mode: string): string {
  return MODE_LABELS[mode as ContractorPaymentMode] ?? mode;
}
