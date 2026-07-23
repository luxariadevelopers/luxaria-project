import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { customerInvoiceStatusLabel } from './labels';
import type { CustomerInvoiceListRow } from './types';

type Props = {
  rows: readonly CustomerInvoiceListRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
};

export function CustomerInvoiceTable({
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
}: Props) {
  const columns: GridColDef<CustomerInvoiceListRow>[] = [
    { field: 'invoiceNumber', headerName: 'Invoice #', width: 130 },
    {
      field: 'invoiceDate',
      headerName: 'Invoice date',
      width: 120,
      valueGetter: (_v, row) => row.invoiceDate.slice(0, 10),
    },
    {
      field: 'dueDate',
      headerName: 'Due',
      width: 110,
      valueGetter: (_v, row) => (row.dueDate ? row.dueDate.slice(0, 10) : '—'),
    },
    {
      field: 'customerId',
      headerName: 'Customer',
      width: 120,
      valueGetter: (_v, row) => row.customerId.slice(-6),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={customerInvoiceStatusLabel(params.row.status)} />
      ),
    },
    { field: 'taxableAmount', headerName: 'Taxable', width: 110, type: 'number' },
    { field: 'totalAmount', headerName: 'Total', width: 110, type: 'number' },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      filterSlot={filterSlot}
      getRowId={(row) => row.id}
      mobileCard={{
        primaryField: 'invoiceNumber',
        metaFields: ['totalAmount', 'invoiceDate'],
        statusField: 'status',
      }}
    />
  );
}
