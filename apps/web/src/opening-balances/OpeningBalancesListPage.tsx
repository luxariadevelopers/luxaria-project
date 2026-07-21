import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { fetchFinancialYearFilterOptions } from '@/director-command-centre/api';
import { useQuery } from '@tanstack/react-query';
import {
  OpeningBalanceFilters,
  type OpeningBalanceFilterState,
} from './OpeningBalanceFilters';
import { OpeningBalanceTable } from './OpeningBalanceTable';
import { resolveOpeningBalanceCapabilities } from './roleAccess';
import { useOpeningBalancePacksList } from './useOpeningBalances';

export function OpeningBalancesListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveOpeningBalanceCapabilities(hasPermission);
  const { projects } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<OpeningBalanceFilterState>({
    search: '',
    financialYearId: '',
    projectId: '',
    status: '',
  });

  const canView = Boolean(access) && caps.canView;
  const canViewFy = Boolean(access) && hasPermission('financial_year.view');

  const fyQuery = useQuery({
    queryKey: ['opening-balances', 'fy-options'],
    queryFn: () => fetchFinancialYearFilterOptions(),
    enabled: canView && canViewFy,
    staleTime: 60_000,
  });

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: filters.search.trim() || undefined,
      financialYearId: filters.financialYearId || undefined,
      projectId: filters.projectId || undefined,
      status: filters.status || undefined,
    }),
    [page, pageSize, filters],
  );

  const list = useOpeningBalancePacksList(listQuery, canView);

  const projectLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      map.set(
        p.id,
        p.projectCode ? `${p.projectCode} · ${p.projectName}` : p.projectName,
      );
    }
    return map;
  }, [projects]);

  const fyLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const fy of fyQuery.data ?? []) {
      map.set(fy.id, fy.name);
    }
    return map;
  }, [fyQuery.data]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Opening balances unavailable"
        message="You need the opening_balance.view permission to browse opening balance packs."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Opening balance list denied"
        message="You do not have permission to load opening balance packs."
      />
    );
  }

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="opening-balances-page">
      <Typography color="text.secondary">
        Draft and posted opening balance packs — balanced ledger lines posted as opening journals.
      </Typography>

      {list.error ? (
        <>
          <OpeningBalanceFilters
            value={filters}
            onChange={setFilters}
            projects={projects}
            financialYears={fyQuery.data ?? []}
            showFinancialYear={canViewFy}
          />
          <RetryPanel error={list.error} onRetry={() => void list.refetch()} forceRetry />
        </>
      ) : (
        <OpeningBalanceTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          page={page}
          pageSize={pageSize}
          rowCount={Number(list.data?.meta?.total ?? rows.length)}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          filterSlot={
            <OpeningBalanceFilters
              value={filters}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
              projects={projects}
              financialYears={fyQuery.data ?? []}
              showFinancialYear={canViewFy}
            />
          }
          fyLabel={(id) => fyLabelById.get(id) ?? id.slice(-6)}
          projectLabel={(id) => (id ? (projectLabelById.get(id) ?? id.slice(-6)) : 'Company')}
        />
      )}
    </Stack>
  );
}
