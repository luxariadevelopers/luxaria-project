import type { ListQualityInspectionsQuery } from './types';

export const qualityInspectionsKeys = {
  all: ['quality-inspections'] as const,
  list: (query: ListQualityInspectionsQuery) =>
    [...qualityInspectionsKeys.all, 'list', query] as const,
  detail: (id: string) =>
    [...qualityInspectionsKeys.all, 'detail', id] as const,
  vendorScore: (vendorId: string) =>
    [...qualityInspectionsKeys.all, 'vendor-score', vendorId] as const,
  inspectableGrns: (projectId: string) =>
    [...qualityInspectionsKeys.all, 'inspectable-grns', projectId] as const,
};
