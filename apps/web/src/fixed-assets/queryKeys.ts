import type { ListFixedAssetsQuery } from './types';

export const fixedAssetsKeys = {
  all: ['fixed-assets'] as const,
  list: (query: ListFixedAssetsQuery) =>
    [...fixedAssetsKeys.all, 'list', query] as const,
};
