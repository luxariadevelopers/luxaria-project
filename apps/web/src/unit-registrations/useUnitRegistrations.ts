import { useQuery } from '@tanstack/react-query';
import { fetchUnitRegistrations } from './api';
import { unitRegistrationsKeys } from './queryKeys';
import type { ListUnitRegistrationsQuery } from './types';

export function useUnitRegistrationsList(
  query: ListUnitRegistrationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: unitRegistrationsKeys.list(query),
    queryFn: () => fetchUnitRegistrations(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
