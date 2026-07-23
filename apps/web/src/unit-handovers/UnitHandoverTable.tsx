import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import type { UnitHandoverListRow } from './types';

type Props = {
  rows: readonly UnitHandoverListRow[];
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

export function UnitHandoverTable({
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
  const columns: GridColDef<UnitHandoverListRow>[] = [
    { field: 'handoverNumber', headerName: 'Handover #', width: 130 },
    { field: 'unitId', headerName: 'Unit', width: 110 },
    { field: 'customerId', headerName: 'Customer', width: 110 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip size="small" label={params.row.status.replace(/_/g, ' ')} />
      ),
    },
    {
      field: 'scheduledAt',
      headerName: 'Scheduled',
      width: 120,
      valueGetter: (_v, row) =>
        row.scheduledAt ? row.scheduledAt.slice(0, 10) : '—',
    },
    {
      field: 'keysHandedOver',
      headerName: 'Keys',
      width: 80,
      valueGetter: (_v, row) => (row.keysHandedOver ? 'Yes' : 'No'),
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
      mobileCard={{
        primaryField: 'handoverNumber',
        metaFields: ['unitId', 'scheduledAt'],
        statusField: 'status',
      }}
    />
  );
}
