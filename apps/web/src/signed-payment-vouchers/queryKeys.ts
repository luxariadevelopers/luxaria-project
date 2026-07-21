import type { ListSignedPaymentVouchersQuery } from './types';

export const signedPaymentVouchersKeys = {
  all: ['signed-payment-vouchers'] as const,
  list: (query: ListSignedPaymentVouchersQuery) =>
    [...signedPaymentVouchersKeys.all, 'list', query] as const,
  detail: (id: string) =>
    [...signedPaymentVouchersKeys.all, 'detail', id] as const,
};
