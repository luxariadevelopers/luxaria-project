import type { ListGstDocumentsQuery, ListGstReturnsQuery } from './types';

export const gstKeys = {
  all: ['gst'] as const,
  documents: (query: ListGstDocumentsQuery) =>
    [...gstKeys.all, 'documents', query] as const,
  returns: (query: ListGstReturnsQuery) =>
    [...gstKeys.all, 'returns', query] as const,
};
