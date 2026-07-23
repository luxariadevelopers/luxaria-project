import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { listRateContracts, type RateContract } from '@/rate-contracts/api';

function rateLineCount(row: {
  boqItemRates?: unknown[];
  labourRates?: unknown[];
  materialInclusiveRates?: unknown[];
  equipmentRates?: unknown[];
}): number {
  return (
    (row.boqItemRates?.length ?? 0) +
    (row.labourRates?.length ?? 0) +
    (row.materialInclusiveRates?.length ?? 0) +
    (row.equipmentRates?.length ?? 0)
  );
}

export function RateContractsPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('rate_contract.view');

  const query = useQuery({
    queryKey: ['rate-contracts', selectedProjectId ?? 'all'],
    queryFn: () =>
      listRateContracts(
        selectedProjectId ? { projectId: selectedProjectId } : {},
      ),
    enabled: canView,
  });

  const columns = useMemo<GridColDef<RateContract>[]>(
    () => [
      {
        field: 'contractNumber',
        headerName: 'Contract #',
        width: 150,
      },
      {
        field: 'version',
        headerName: 'Ver',
        width: 70,
        valueGetter: (_v, row) => `v${row.version}`,
      },
      {
        field: 'scope',
        headerName: 'Scope',
        width: 110,
        renderCell: (params) => (
          <Chip size="small" label={params.row.scope} variant="outlined" />
        ),
      },
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) => row.title || '—',
      },
      {
        field: 'validity',
        headerName: 'Validity',
        width: 200,
        valueGetter: (_v, row) =>
          `${String(row.validityFrom).slice(0, 10)} → ${String(row.validityTo).slice(0, 10)}`,
      },
      {
        field: 'rates',
        headerName: 'Rates',
        width: 90,
        type: 'number',
        valueGetter: (_v, row) => rateLineCount(row),
      },
      {
        field: 'retentionPercent',
        headerName: 'Retention %',
        width: 120,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip size="small" label={params.row.status} />
        ),
      },
    ],
    [],
  );

  if (!canView) return <PermissionDenied />;
  if (query.isError) {
    return (
      <RetryPanel
        error={query.error}
        onRetry={() => void query.refetch()}
        forceRetry
      />
    );
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle="Schedule of rates (BOQ, labour, material-inclusive, equipment) with retention, tax, advance recovery, and LD terms. Company-wide or project-scoped. Agreements and work orders consume the active revision."
      />
      {!selectedProjectId ? (
        <Alert severity="info">
          Showing all accessible rate contracts. Select a project to filter
          project-scoped schedules.
        </Alert>
      ) : null}
      <DataTable
        title="Rate contracts"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No rate contracts"
        emptyDescription="No rate contracts yet."
        height={520}
        paginationMode="client"
        mobileCard={{
          primaryField: 'contractNumber',
          metaFields: ['title', 'validity'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />
    </Stack>
  );
}
