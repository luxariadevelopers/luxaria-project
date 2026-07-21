/** Canonical list URL for payment schedules. */
export const PAYMENT_SCHEDULES_LIST_PATH = '/sales/payment-schedules';

export function paymentSchedulesListPath(query?: { tab?: string }): string {
  if (query?.tab) {
    return `${PAYMENT_SCHEDULES_LIST_PATH}?tab=${encodeURIComponent(query.tab)}`;
  }
  return PAYMENT_SCHEDULES_LIST_PATH;
}

export function paymentScheduleDetailPath(id: string): string {
  return `${PAYMENT_SCHEDULES_LIST_PATH}/${id}`;
}
