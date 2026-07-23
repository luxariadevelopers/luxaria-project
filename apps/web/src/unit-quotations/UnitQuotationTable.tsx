import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import type { UnitQuotationListRow } from './types';

type Props = {
  rows: readonly UnitQuotationListRow[];
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

export function UnitQuotationTable({
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
  const columns: GridColDef<UnitQuotationListRow>[] = [
    { field: 'quotationNumber', headerName: 'Quotation #', width: 130 },
    { field: 'unitId', headerName: 'Unit', width: 120 },
    { field: 'customerId', headerName: 'Customer', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip size="small" label={params.row.status.replace(/_/g, ' ')} />
      ),
    },
    {
      field: 'grandTotal',
      headerName: 'Total',
      width: 120,
      valueGetter: (_v, row) =>
        row.totals?.grandTotal?.toLocaleString() ?? '—',
    },
    {
      field: 'validUntil',
      headerName: 'Valid until',
      width: 120,
      valueGetter: (_v, row) =>
        row.validUntil ? row.validUntil.slice(0, 10) : '—',
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
        primaryField: 'quotationNumber',
        metaFields: ['grandTotal', 'validUntil'],
        statusField: 'status',
      }}
    />
  );
}
