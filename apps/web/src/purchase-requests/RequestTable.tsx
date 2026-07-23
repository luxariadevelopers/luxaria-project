import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { purchaseRequestPriorityLabel } from './labels';
import { PurchaseRequestStatusChip } from './PurchaseRequestStatusChip';
import type { PublicPurchaseRequest } from './types';

type Props = {
  rows: readonly PublicPurchaseRequest[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
};

/**
 * Purchase request list with deep links to detail (Phase 062).
 * Route: `/procurement/purchase-requests/:requestId`
 */
export function RequestTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  filterSlot,
  toolbarActions,
}: Props) {
  const columns: GridColDef<PublicPurchaseRequest>[] = [
    {
      field: 'requestNumber',
      headerName: 'Number',
      width: 160,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={`/procurement/purchase-requests/${params.row.id}`}
          underline="hover"
          data-testid={`pr-link-${params.row.id}`}
        >
          {params.row.requestNumber}
        </Link>
      ),
    },
    {
      field: 'requiredByDate',
      headerName: 'Required by',
      width: 130,
      valueGetter: (_v, row) => formatDate(row.requiredByDate),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 110,
      valueGetter: (_v, row) => purchaseRequestPriorityLabel(row.priority),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => (
        <PurchaseRequestStatusChip
          status={params.row.status}
          partiallyApproved={params.row.isPartiallyApproved}
        />
      ),
    },
    {
      field: 'estimatedTotal',
      headerName: 'Est. total',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.estimatedTotal),
    },
    {
      field: 'items',
      headerName: 'Lines',
      width: 80,
      valueGetter: (_v, row) => row.items.length,
    },
  ];

  return (
    <DataTable
      title="Purchase requests"
      rows={[...rows]}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No purchase requests"
      emptyDescription="Create a request or adjust filters."
      height={520}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search request number…"
      preferencesKey="purchase-requests-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      mobileCard={{
        primaryField: 'requestNumber',
        metaFields: ['requiredByDate', 'priority'],
        statusField: 'status',
      }}
    />
  );
}
