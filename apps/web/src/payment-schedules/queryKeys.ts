import type { ListPaymentSchedulesQuery } from './types';

export const paymentSchedulesKeys = {
  all: ['payment-schedules'] as const,
  lists: () => [...paymentSchedulesKeys.all, 'list'] as const,
  list: (query: ListPaymentSchedulesQuery) =>
    [...paymentSchedulesKeys.lists(), query] as const,
  detail: (id: string) =>
    [...paymentSchedulesKeys.all, 'detail', id] as const,
  overdue: (page: number, limit: number) =>
    [...paymentSchedulesKeys.all, 'overdue', page, limit] as const,
  bookings: (projectId: string | null) =>
    ['bookings', 'payment-schedule-options', projectId] as const,
};
