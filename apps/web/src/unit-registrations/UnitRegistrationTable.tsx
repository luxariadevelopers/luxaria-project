import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import type { UnitRegistrationListRow } from './types';

type Props = {
  rows: readonly UnitRegistrationListRow[];
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

export function UnitRegistrationTable({
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
  const columns: GridColDef<UnitRegistrationListRow>[] = [
    { field: 'registrationNumber', headerName: 'Registration #', width: 140 },
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
      field: 'registrationDate',
      headerName: 'Registered',
      width: 120,
      valueGetter: (_v, row) =>
        row.registrationDate ? row.registrationDate.slice(0, 10) : '—',
    },
    {
      field: 'documentNumber',
      headerName: 'Doc #',
      width: 120,
      valueGetter: (_v, row) => row.documentNumber ?? '—',
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
