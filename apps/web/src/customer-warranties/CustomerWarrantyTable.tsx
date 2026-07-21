import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import type { CustomerWarrantyListRow } from './types';

type Props = {
  rows: readonly CustomerWarrantyListRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
};

export function CustomerWarrantyTable({
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
  toolbarActions,
}: Props) {
  const columns: GridColDef<CustomerWarrantyListRow>[] = [
    { field: 'ticketNumber', headerName: 'Ticket #', width: 120 },
    { field: 'category', headerName: 'Category', width: 120 },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip size="small" label={params.row.status.replace(/_/g, ' ')} />
      ),
    },
    {
      field: 'raisedAt',
      headerName: 'Raised',
      width: 120,
      valueGetter: (_v, row) =>
        row.raisedAt ? row.raisedAt.slice(0, 10) : '—',
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
    />
  );
}
