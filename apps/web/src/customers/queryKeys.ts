import type { ListCustomersQuery } from './types';

export const customersKeys = {
  all: ['customers'] as const,
  list: (query: ListCustomersQuery) =>
    [...customersKeys.all, 'list', query] as const,
  detail: (id: string) => [...customersKeys.all, 'detail', id] as const,
  documents: (id: string) => [...customersKeys.all, 'documents', id] as const,
  bookings: (id: string) => [...customersKeys.all, 'bookings', id] as const,
  receipts: (id: string) => [...customersKeys.all, 'receipts', id] as const,
  ledger: (id: string) => [...customersKeys.all, 'ledger', id] as const,
};
