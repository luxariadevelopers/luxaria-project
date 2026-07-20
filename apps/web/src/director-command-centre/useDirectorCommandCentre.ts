import { useQuery } from '@tanstack/react-query';
import {
  fetchDirectorCommandCentreSummary,
  fetchDirectorFilterOptions,
  fetchFinancialYearFilterOptions,
} from './api';
import {
  directorFilterOptionsQueryKey,
  directorSummaryQueryKey,
  financialYearFilterOptionsQueryKey,
} from './queryKeys';
import type { CommandCentreQuery } from './types';

export function useDirectorCommandCentreSummary(
  query: CommandCentreQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: directorSummaryQueryKey(query),
    queryFn: () => fetchDirectorCommandCentreSummary(query),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useDirectorFilterOptions(enabled = true) {
  return useQuery({
    queryKey: directorFilterOptionsQueryKey,
    queryFn: fetchDirectorFilterOptions,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useFinancialYearFilterOptions(enabled = true) {
  return useQuery({
    queryKey: financialYearFilterOptionsQueryKey,
    queryFn: fetchFinancialYearFilterOptions,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
