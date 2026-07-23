import { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { CostCentreFilters, type CostCentreFilterState } from './CostCentreFilters';
import { CostCentreTable } from './CostCentreTable';
import { QuickCreateCostCentreDialog } from './QuickCreateCostCentreDialog';
import { resolveCostCentreCapabilities } from './roleAccess';
import { CostCentreKind, type CostCentreKind as CostCentreKindValue } from './types';
import { useCostCentresList } from './useCostCentres';

/**
 * Cost centres — `/accounting/cost-centres`.
 * Nest: `GET /cost-centres` — `cost_centre.view`
 */
export function CostCentresListPage() {
  const { hasPermission, access } = useAuth();
  const notify = useNotify();
  const caps = resolveCostCentreCapabilities(hasPermission);
  const { projects, selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<CostCentreFilterState>({
    search: '',
    projectId: '',
    kind: '',
    status: '',
  });
  const [createKind, setCreateKind] = useState<CostCentreKindValue | null>(null);

  const canView = Boolean(access) && caps.canView;
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Typography color="text.secondary">
          Company and project cost / profit centres for budget and ledger tagging.
        </Typography>
        {caps.canManage ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateKind(CostCentreKind.CostCentre)}
            >
              Cost centre
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateKind(CostCentreKind.ProfitCentre)}
            >
              Profit centre
            </Button>
          </Stack>
        ) : null}
      </Stack>

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

      {createKind ? (
        <QuickCreateCostCentreDialog
          open
          kind={createKind}
          projectId={selectedProject?.id ?? (filters.projectId || null)}
          projectCode={selectedProject?.projectCode ?? null}
          projectName={selectedProject?.projectName ?? null}
          onClose={() => setCreateKind(null)}
          onCreated={async () => {
            notify.success(
              createKind === CostCentreKind.ProfitCentre
                ? 'Profit centre created'
                : 'Cost centre created',
            );
            await list.refetch();
          }}
        />
      ) : null}
    </Stack>
  );
}
