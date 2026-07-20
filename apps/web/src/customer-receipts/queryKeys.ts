import type { ListCustomerReceiptsQuery } from './types';

export const customerReceiptsKeys = {
  all: ['customer-receipts'] as const,
  lists: () => [...customerReceiptsKeys.all, 'list'] as const,
  list: (query: ListCustomerReceiptsQuery) =>
    [...customerReceiptsKeys.lists(), query] as const,
  detail: (id: string) =>
    [...customerReceiptsKeys.all, 'detail', id] as const,
  bankAccounts: ['company-bank-accounts', 'options'] as const,
  bookings: (projectId: string | null) =>
    ['bookings', 'collection-options', projectId] as const,
  demands: (bookingId: string) =>
    ['payment-schedules', 'allocatable-demands', bookingId] as const,
};
