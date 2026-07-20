import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { approvalStatusCatalog } from '@luxaria/shared-types';
import {
  DataTable,
  type DataTableRowAction,
} from '@/components/data-table';
import { formatDateTime, formatInr } from '@/format';
import { AgeingIndicator } from './AgeingIndicator';
import type { PublicApprovalRequest } from './types';
import {
  APPROVAL_SAVED_FILTER_KEYS,
  type ApprovalInboxFilterState,
} from './validateFilters';

type Props = {
  rows: PublicApprovalRequest[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  filterSlot: ReactNode;
  filterValues: Record<string, string>;
  onApplySavedQuery: (query: {
    search: string;
    filters: Record<string, string>;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    limit: number;
  }) => void;
  onResetPreferences: () => void;
};

export function ApprovalTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  filterSlot,
  filterValues,
  onApplySavedQuery,
  onResetPreferences,
}: Props) {
  const navigate = useNavigate();

  const columns: GridColDef<PublicApprovalRequest>[] = useMemo(
    () => [
      {
        field: 'approvalCode',
        headerName: 'Code',
        width: 140,
      },
      {
        field: 'module',
        headerName: 'Module',
        width: 120,
      },
      {
        field: 'entityType',
        headerName: 'Entity',
        width: 140,
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 130,
        valueFormatter: (value: number) => formatInr(value),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            variant="outlined"
            label={approvalStatusCatalog.label(String(params.value))}
          />
        ),
      },
      {
        field: 'ageing',
        headerName: 'Ageing',
        width: 150,
        sortable: false,
        renderCell: (params) => (
          <AgeingIndicator
            stepEnteredAt={params.row.stepEnteredAt}
            requestedAt={params.row.requestedAt}
            escalated={params.row.escalated}
          />
        ),
      },
      {
        field: 'currentStep',
        headerName: 'Step',
        width: 80,
        type: 'number',
      },
      {
        field: 'requestedAt',
        headerName: 'Requested',
        width: 160,
        valueFormatter: (value: string) => formatDateTime(value),
      },
    ],
    [],
  );

  const rowActions: DataTableRowAction<PublicApprovalRequest>[] = [
    {
      id: 'open',
      label: 'Open',
      permission: 'approval.view',
      onClick: (row) => navigate(`/approvals/${row.id}`),
    },
  ];

  return (
    <DataTable<PublicApprovalRequest>
      title="Approval inbox"
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No approval requests"
      emptyDescription="Try another status, module, amount or ageing filter — or wait for new submissions."
      paginationMode="server"
      sortingMode="client"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      filterSlot={filterSlot}
      preferencesKey="approvals-inbox"
      allowedFilterKeys={[...APPROVAL_SAVED_FILTER_KEYS]}
      filterValues={filterValues}
      onApplySavedQuery={onApplySavedQuery}
      onResetPreferences={onResetPreferences}
      rowActions={rowActions}
      getRowId={(row) => row.id}
      onRowClick={(params) => navigate(`/approvals/${params.row.id}`)}
      height={520}
      showColumnVisibility
    />
  );
}

/** Map inbox filter state → DataTable preference filterValues. */
export function approvalFiltersToPreferenceValues(
  filters: ApprovalInboxFilterState,
): Record<string, string> {
  return {
    status: filters.status,
    module: filters.module,
    entityType: filters.entityType,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    ageing: filters.ageing,
  };
}
