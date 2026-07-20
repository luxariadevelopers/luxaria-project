import { useQuery } from '@tanstack/react-query';
import {
  fetchBookAccountOptions,
  fetchCashBankBook,
  fetchFinancialYearFilterOptions,
} from './api';
import { cashBankBookQueryKeys } from './queryKeys';
import type { AccountingBookKind, CashBankBookQuery } from './types';

export function useCashBankBook(
  kind: AccountingBookKind,
  query: CashBankBookQuery,
  enabled: boolean,
) {
  return useQuery({
    queryKey: cashBankBookQueryKeys.report(kind, query),
    queryFn: () => fetchCashBankBook(kind, query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBookAccountOptions(
  kind: AccountingBookKind,
  enabled: boolean,
) {
  return useQuery({
    queryKey: cashBankBookQueryKeys.accounts(kind),
    queryFn: () => fetchBookAccountOptions(kind),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useBookFinancialYears(enabled: boolean) {
  return useQuery({
    queryKey: cashBankBookQueryKeys.financialYears(),
    queryFn: () => fetchFinancialYearFilterOptions(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
