import type { ListMaterialCoefficientsQuery } from './types';

export const materialCoefficientKeys = {
  all: ['material-consumption-standards'] as const,
  list: (query: ListMaterialCoefficientsQuery) =>
    [...materialCoefficientKeys.all, 'list', query] as const,
  detail: (id: string) =>
    [...materialCoefficientKeys.all, 'detail', id] as const,
  resolve: (query: Record<string, unknown>) =>
    [...materialCoefficientKeys.all, 'resolve', query] as const,
};
