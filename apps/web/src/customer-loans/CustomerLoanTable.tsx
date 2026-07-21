import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import type { CustomerLoanListRow } from './types';

type Props = {
  rows: readonly CustomerLoanListRow[];
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

export function CustomerLoanTable({
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
  const columns: GridColDef<CustomerLoanListRow>[] = [
    { field: 'loanNumber', headerName: 'Loan #', width: 120 },
    { field: 'bankName', headerName: 'Bank', flex: 1, minWidth: 140 },
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
      field: 'sanctionAmount',
      headerName: 'Sanctioned',
      width: 120,
      valueGetter: (_v, row) =>
        row.sanctionAmount != null ? row.sanctionAmount.toLocaleString() : '—',
    },
    {
      field: 'totalDisbursed',
      headerName: 'Disbursed',
      width: 120,
      valueGetter: (_v, row) => row.totalDisbursed.toLocaleString(),
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
