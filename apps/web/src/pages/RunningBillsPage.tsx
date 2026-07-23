import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  applyRunningBillClientFilters,
  hasRunningBillClientFilters,
} from '@/running-bills/applyClientFilters';
import {
  RunningBillFilters,
  type RunningBillFilterState,
} from '@/running-bills/RunningBillFilters';
import { RunningBillTable } from '@/running-bills/RunningBillTable';
import { resolveRunningBillCapabilities } from '@/running-bills/roleAccess';
import type { ContractorBillStatus } from '@/running-bills/types';
import {
  useContractorOptions,
  useRunningBillsList,
} from '@/running-bills/useRunningBills';

/**
 * Running bill work queue — `/contractors/running-bills` (Micro Phase 093).
 *
 * Nest: `GET /contractor-bills`
 * Permissions: `running_bill.view` · create via `running_bill.create`
 */
export function RunningBillsPage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const caps = resolveRunningBillCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RunningBillFilterState>({
    status: '',
    periodFrom: '',
    periodTo: '',
  });

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      status: (filters.status || undefined) as ContractorBillStatus | undefined,
    }),
    [page, pageSize, projectId, filters.status],
  );

  const list = useRunningBillsList(listQuery, canView && Boolean(projectId));
  const contractors = useContractorOptions(
    '',
    canView && caps.canViewContractors,
  );

  const contractorLabel = (contractorId: string) => {
    const match = contractors.data?.find((c) => c.id === contractorId);
    if (!match) return contractorId.slice(-6);
    return [match.contractorCode, match.legalName].filter(Boolean).join(' — ');
  };

  const clientFiltered = useMemo(() => {
    const items = list.data?.items ?? [];
    const period = {
      periodFrom: filters.periodFrom,
      periodTo: filters.periodTo,
    };
    let rows = hasRunningBillClientFilters(period)
      ? applyRunningBillClientFilters(items, period)
      : items;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (row) =>
          row.billNumber.toLowerCase().includes(q) ||
          `ra-${row.raNumber}`.includes(q),
      );
    }
    return rows;
  }, [list.data?.items, filters.periodFrom, filters.periodTo, search]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Running bills unavailable"
        message="You need the running_bill.view permission to open this queue."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Running bills are project-scoped. Choose an active project to load the RA work queue."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="running-bills-page">
      <PageHeader
        subtitle="Contractor RA claim work queue — certified value, deductions, payable."
        actions={
          caps.canCreate ? (
            <Button
              variant="contained"
              onClick={() => navigate('/contractors/running-bills/new')}
              data-testid="running-bill-create"
            >
              New running bill
            </Button>
          ) : undefined
        }
      />

      <RunningBillTable
        rows={clientFiltered}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={
          hasRunningBillClientFilters({
            periodFrom: filters.periodFrom,
            periodTo: filters.periodTo,
          }) || search.trim()
            ? clientFiltered.length
            : (list.data?.meta?.total ?? clientFiltered.length)
        }
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filterSlot={
          <RunningBillFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        contractorLabel={contractorLabel}
        onOpen={(row) =>
          navigate(`/contractors/running-bills/${encodeURIComponent(row.id)}`)
        }
      />

      {list.isError ? (
        <Typography variant="caption" color="error">
          {getErrorMessage(list.error)}
        </Typography>
      ) : null}
    </Stack>
  );
}
