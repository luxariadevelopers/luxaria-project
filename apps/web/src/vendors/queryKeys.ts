import type { ListVendorsQuery } from './types';

export const vendorsKeys = {
  all: ['vendors'] as const,
  list: (query: ListVendorsQuery) =>
    [...vendorsKeys.all, 'list', query] as const,
  detail: (id: string) => [...vendorsKeys.all, 'detail', id] as const,
  documents: (id: string) => [...vendorsKeys.all, 'documents', id] as const,
  projects: (id: string) => [...vendorsKeys.all, 'projects', id] as const,
  ledger: (id: string) => [...vendorsKeys.all, 'ledger', id] as const,
  invoices: (id: string) => [...vendorsKeys.all, 'invoices', id] as const,
  payments: (id: string) => [...vendorsKeys.all, 'payments', id] as const,
  qualityScore: (id: string) =>
    [...vendorsKeys.all, 'quality-score', id] as const,
};
