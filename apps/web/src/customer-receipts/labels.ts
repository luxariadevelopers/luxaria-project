import {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from './types';

const PAYMENT_MODE_LABELS: Record<CustomerReceiptPaymentMode, string> = {
  [CustomerReceiptPaymentMode.BankTransfer]: 'Bank transfer',
  [CustomerReceiptPaymentMode.Neft]: 'NEFT',
  [CustomerReceiptPaymentMode.Rtgs]: 'RTGS',
  [CustomerReceiptPaymentMode.Imps]: 'IMPS',
  [CustomerReceiptPaymentMode.Upi]: 'UPI',
  [CustomerReceiptPaymentMode.Cheque]: 'Cheque',
  [CustomerReceiptPaymentMode.Cash]: 'Cash',
  [CustomerReceiptPaymentMode.Other]: 'Other',
};

const SOURCE_TYPE_LABELS: Record<CustomerReceiptSourceType, string> = {
  [CustomerReceiptSourceType.OwnFund]: 'Own fund',
  [CustomerReceiptSourceType.BankLoan]: 'Bank loan',
  [CustomerReceiptSourceType.RefundAdjustment]: 'Refund adjustment',
  [CustomerReceiptSourceType.Other]: 'Other',
};

const STATUS_LABELS: Record<CustomerReceiptStatus, string> = {
  [CustomerReceiptStatus.Draft]: 'Draft',
  [CustomerReceiptStatus.Posted]: 'Posted',
  [CustomerReceiptStatus.Cancelled]: 'Cancelled',
};

export function paymentModeLabel(mode: string): string {
  return (
    PAYMENT_MODE_LABELS[mode as CustomerReceiptPaymentMode] ?? mode
  );
}

export function sourceTypeLabel(source: string): string {
  return (
    SOURCE_TYPE_LABELS[source as CustomerReceiptSourceType] ?? source
  );
}

export function receiptStatusLabel(status: string): string {
  return STATUS_LABELS[status as CustomerReceiptStatus] ?? status;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return String(value).slice(0, 10);
}
