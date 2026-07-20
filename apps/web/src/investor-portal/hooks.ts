import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isForbiddenError } from '@/api/client';
import {
  fetchInvestorPortalBundle,
  isInvestorPortalAccessError,
} from './api';
import {
  filterInvestorStatements,
  listAuthorisedProjectOptions,
} from './aggregateDocuments';
import { investorPortalQueryKeys } from './queryKeys';
import {
  DEFAULT_STATEMENT_FILTERS,
  type InvestorStatementFilters,
} from './types';

export function useInvestorPortalBundle() {
  return useQuery({
    queryKey: investorPortalQueryKeys.bundle(),
    queryFn: fetchInvestorPortalBundle,
    retry: (count, error) => {
      if (isForbiddenError(error) || isInvestorPortalAccessError(error)) {
        return false;
      }
      return count < 1;
    },
  });
}

export function useInvestorStatementsView() {
  const query = useInvestorPortalBundle();
  const [filters, setFilters] = useState<InvestorStatementFilters>(
    DEFAULT_STATEMENT_FILTERS,
  );

  const filteredStatements = useMemo(() => {
    const rows = query.data?.statements ?? [];
    return filterInvestorStatements(rows, filters);
  }, [filters, query.data?.statements]);

  const projectOptions = useMemo(
    () => listAuthorisedProjectOptions(query.data?.projects ?? []),
    [query.data?.projects],
  );

  return {
    ...query,
    filters,
    setFilters,
    filteredStatements,
    projectOptions,
  };
}

export function useInvestorDocumentsView() {
  const query = useInvestorPortalBundle();
  return {
    ...query,
    documents: query.data?.documents ?? [],
  };
}
