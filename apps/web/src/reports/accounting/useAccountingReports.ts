import { useQuery } from '@tanstack/react-query';
import {
  fetchAccountingReport,
  fetchAccountingReportCatalogue,
} from './api';
import { accountingReportsKeys } from './queryKeys';
import type {
  AccountingReportQuery,
  AccountingReportType,
} from './types';

export function useAccountingReportCatalogue(enabled = true) {
  return useQuery({
    queryKey: accountingReportsKeys.catalogue(),
    queryFn: fetchAccountingReportCatalogue,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useAccountingReport(
  reportType: AccountingReportType | '',
  query: AccountingReportQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: accountingReportsKeys.report(
      reportType as AccountingReportType,
      query,
    ),
    queryFn: () =>
      fetchAccountingReport(reportType as AccountingReportType, query),
    enabled: enabled && Boolean(reportType),
    staleTime: 15_000,
    retry: false,
  });
}
