import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { CostCentreFilters, type CostCentreFilterState } from './CostCentreFilters';
import { CostCentreTable } from './CostCentreTable';
import { resolveCostCentreCapabilities } from './roleAccess';
import { useCostCentresList } from './useCostCentres';

/**
 * Cost centres — `/accounting/cost-centres`.
 * Nest: `GET /cost-centres` — `cost_centre.view`
 */
export function CostCentresListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveCostCentreCapabilities(hasPermission);
  const { projects } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<CostCentreFilterState>({
    search: '',
    projectId: '',
    kind: '',
    status: '',
  });

  const canView = Boolean(access) && caps.canView;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: filters.search.trim() || undefined,
      projectId: filters.projectId || undefined,
      kind: filters.kind || undefined,
      status: filters.status || undefined,
    }),
    [page, pageSize, filters],
  );

  const list = useCostCentresList(listQuery, canView);

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

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Cost centres unavailable"
        message="You need the cost_centre.view permission to browse cost and profit centres."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Cost centre list denied"
        message="You do not have permission to load cost centres."
      />
    );
  }

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="cost-centres-page">
      <Typography color="text.secondary">
        Company and project cost / profit centres for budget and ledger tagging.
      </Typography>

      {list.error ? (
        <>
          <CostCentreFilters value={filters} onChange={setFilters} projects={projects} />
          <RetryPanel error={list.error} onRetry={() => void list.refetch()} forceRetry />
        </>
      ) : (
        <CostCentreTable
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
            <CostCentreFilters
              value={filters}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
              projects={projects}
            />
          }
          projectLabel={(id) => (id ? (projectLabelById.get(id) ?? id.slice(-6)) : 'Company')}
        />
      )}
    </Stack>
  );
}
