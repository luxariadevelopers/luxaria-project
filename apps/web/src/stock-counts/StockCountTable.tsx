import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import type { StockCountCapabilities } from './roleAccess';
import { StockCountStatusChip } from './StockCountStatusChip';
import type { PublicStockCount } from './types';
import { resolveStockCountRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicStockCount[];
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
  caps: StockCountCapabilities;
  onOpenDetail?: (row: PublicStockCount) => void;
  onSubmit?: (row: PublicStockCount) => void;
  onReview?: (row: PublicStockCount) => void;
  onApprove?: (row: PublicStockCount) => void;
  onPost?: (row: PublicStockCount) => void;
  onCancel?: (row: PublicStockCount) => void;
};

export function StockCountTable({
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
  caps,
  onOpenDetail,
  onSubmit,
  onReview,
  onApprove,
  onPost,
  onCancel,
}: Props) {
  const columns: GridColDef<PublicStockCount>[] = [
    {
      field: 'countNumber',
      headerName: 'Count',
      width: 150,
    },
    {
      field: 'countDate',
      headerName: 'Count date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.countDate),
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 140,
      valueGetter: (_v, row) => row.location || '—',
    },
    {
      field: 'itemCount',
      headerName: 'Lines',
      width: 80,
      valueGetter: (_v, row) => row.items?.length ?? 0,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => (
        <StockCountStatusChip status={params.row.status} />
      ),
    },
    {
      field: 'requiresDirectorApproval',
      headerName: 'Large variance',
      width: 140,
      renderCell: (params) =>
        params.row.requiresDirectorApproval ? (
          <Chip
            size="small"
            color="warning"
            label="Director approve"
            data-testid="stock-count-director-flag"
          />
        ) : (
          '—'
        ),
    },
  ];

  const rowActions: DataTableRowAction<PublicStockCount>[] = [];

  if (onOpenDetail) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpenDetail,
    });
  }
  if (onSubmit) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveStockCountRowActions(row, caps).includes('submit'),
    });
  }
  if (onReview) {
    rowActions.push({
      id: 'review',
      label: 'Mark reviewed',
      onClick: onReview,
      disabled: (row) =>
        !resolveStockCountRowActions(row, caps).includes('review'),
    });
  }
  if (onApprove) {
    rowActions.push({
      id: 'approve',
      label: 'Approve',
      onClick: onApprove,
      disabled: (row) =>
        !resolveStockCountRowActions(row, caps).includes('approve'),
    });
  }
  if (onPost) {
    rowActions.push({
      id: 'post',
      label: 'Post adjustment',
      onClick: onPost,
      disabled: (row) =>
        !resolveStockCountRowActions(row, caps).includes('post'),
    });
  }
  if (onCancel) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      onClick: onCancel,
      danger: true,
      disabled: (row) =>
        !resolveStockCountRowActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable<PublicStockCount>
      rows={[...rows]}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search count number…"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      emptyTitle="No stock counts"
      emptyDescription="Create a physical stock count to start the review and adjustment workflow."
      preferencesKey="stock-counts-list"
      onRowClick={
        onOpenDetail ? (params) => onOpenDetail(params.row) : undefined
      }
    />
  );
}
