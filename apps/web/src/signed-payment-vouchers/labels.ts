import { getDomainStatusLabel } from '@/status';
import { SIGNED_PAYMENT_VOUCHER_TYPE } from './types';

export function signedPaymentVoucherStatusLabel(status: string): string {
  return getDomainStatusLabel('signedPaymentVoucher', status, status);
}

export function signedPaymentVoucherTypeLabel(type: string): string {
  if (type === SIGNED_PAYMENT_VOUCHER_TYPE.Labour) return 'Labour';
  if (type === SIGNED_PAYMENT_VOUCHER_TYPE.CashPayment) return 'Cash payment';
  return type;
}
