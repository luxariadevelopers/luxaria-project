import { useQuery } from '@tanstack/react-query';
import {
  fetchConstructionReport,
  fetchConstructionReportCatalogue,
} from './api';
import { constructionReportsKeys } from './queryKeys';
import type {
  ConstructionReportQuery,
  ConstructionReportType,
} from './types';

export function useConstructionReportCatalogue(enabled = true) {
  return useQuery({
    queryKey: constructionReportsKeys.catalogue(),
    queryFn: fetchConstructionReportCatalogue,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useConstructionReport(
  reportType: ConstructionReportType | '',
  query: ConstructionReportQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: constructionReportsKeys.report(
      reportType as ConstructionReportType,
      query,
    ),
    queryFn: () =>
      fetchConstructionReport(reportType as ConstructionReportType, query),
    enabled: enabled && Boolean(reportType),
    staleTime: 15_000,
    retry: false,
  });
}
