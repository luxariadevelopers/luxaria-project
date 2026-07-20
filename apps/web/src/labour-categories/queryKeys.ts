import type {
  ListLabourCategoriesQuery,
  ListLabourCategoryRatesQuery,
  ResolveLabourCategoryRateQuery,
} from './types';

export const labourCategoryKeys = {
  all: ['labour-categories'] as const,
  lists: () => [...labourCategoryKeys.all, 'list'] as const,
  list: (query: ListLabourCategoriesQuery) =>
    [...labourCategoryKeys.lists(), query] as const,
  details: () => [...labourCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...labourCategoryKeys.details(), id] as const,
  rates: (categoryId: string, query: ListLabourCategoryRatesQuery = {}) =>
    [...labourCategoryKeys.all, 'rates', categoryId, query] as const,
  resolve: (query: ResolveLabourCategoryRateQuery) =>
    [...labourCategoryKeys.all, 'resolve-rate', query] as const,
};
