import { useQuery } from '@tanstack/react-query';
import { fetchFixedAssets } from './api';
import { fixedAssetsKeys } from './queryKeys';
import type { ListFixedAssetsQuery } from './types';

export function useFixedAssetsList(query: ListFixedAssetsQuery, enabled = true) {
  return useQuery({
    queryKey: fixedAssetsKeys.list(query),
    queryFn: () => fetchFixedAssets(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
