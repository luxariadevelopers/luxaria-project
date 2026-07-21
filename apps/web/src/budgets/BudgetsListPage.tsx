import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { fetchFinancialYearFilterOptions } from '@/director-command-centre/api';
import { BudgetFilters, type BudgetFilterState } from './BudgetFilters';
import { BudgetTable } from './BudgetTable';
import { resolveBudgetCapabilities } from './roleAccess';
import { useBudgetsList } from './useBudgets';

export function BudgetsListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBudgetCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<BudgetFilterState>({
    financialYearId: '',
    status: '',
  });

  const canView = Boolean(access) && caps.canView;
  const canViewFy = Boolean(access) && hasPermission('financial_year.view');
  const projectId = selectedProjectId;

  const fyQuery = useQuery({
    queryKey: ['budgets', 'fy-options'],
    queryFn: () => fetchFinancialYearFilterOptions(),
    enabled: canView && canViewFy,
    staleTime: 60_000,
  });

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      financialYearId: filters.financialYearId || undefined,
      status: filters.status || undefined,
    }),
    [page, pageSize, projectId, filters],
  );

  const list = useBudgetsList(listQuery, canView && Boolean(projectId));

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
        title="Budgets unavailable"
        message="You need the budget.view permission to browse budgets."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose a project from the header to list project budgets."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Budget list denied"
        message="You do not have permission to load budgets."
      />
    );
  }

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="budgets-page">
      <Typography color="text.secondary">
        Project budgets by financial year — draft, approval, and revision workflow.
      </Typography>

      {list.error ? (
        <>
          <BudgetFilters
            value={filters}
            onChange={setFilters}
            financialYears={fyQuery.data ?? []}
            showFinancialYear={canViewFy}
          />
          <RetryPanel error={list.error} onRetry={() => void list.refetch()} forceRetry />
        </>
      ) : (
        <BudgetTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          page={page}
          pageSize={pageSize}
          rowCount={Number(list.data?.meta?.total ?? rows.length)}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          filterSlot={
            <BudgetFilters
              value={filters}
              onChange={(next) => { setFilters(next); setPage(1); }}
              financialYears={fyQuery.data ?? []}
              showFinancialYear={canViewFy}
            />
          }
          fyLabel={(id) => fyLabelById.get(id) ?? id.slice(-6)}
        />
      )}
    </Stack>
  );
}
