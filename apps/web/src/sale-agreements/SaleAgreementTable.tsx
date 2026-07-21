import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import type { SaleAgreementListRow } from './types';

type Props = {
  rows: readonly SaleAgreementListRow[];
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

export function SaleAgreementTable({
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
  const columns: GridColDef<SaleAgreementListRow>[] = [
    { field: 'agreementNumber', headerName: 'Agreement #', width: 130 },
    { field: 'unitId', headerName: 'Unit', width: 110 },
    { field: 'customerId', headerName: 'Customer', width: 110 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip size="small" label={params.row.status.replace(/_/g, ' ')} />
      ),
    },
    {
      field: 'agreementValue',
      headerName: 'Value',
      width: 120,
      valueGetter: (_v, row) => row.agreementValue.toLocaleString(),
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
