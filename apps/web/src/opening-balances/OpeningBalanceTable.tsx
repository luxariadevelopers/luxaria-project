import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { openingBalanceStatusLabel } from './labels';
import type { OpeningBalanceListRow } from './types';

type Props = {
  rows: readonly OpeningBalanceListRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
  fyLabel?: (id: string) => string;
  projectLabel?: (id: string | null) => string;
};

export function OpeningBalanceTable({
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
  fyLabel,
  projectLabel,
}: Props) {
  const columns: GridColDef<OpeningBalanceListRow>[] = [
    { field: 'packNumber', headerName: 'Pack #', width: 130 },
    {
      field: 'financialYearId',
      headerName: 'Financial year',
      width: 150,
      valueGetter: (_v, row) => fyLabel?.(row.financialYearId) ?? row.financialYearId.slice(-6),
    },
    {
      field: 'projectId',
      headerName: 'Project',
      width: 150,
      valueGetter: (_v, row) =>
        row.projectId ? (projectLabel?.(row.projectId) ?? row.projectId.slice(-6)) : 'Company',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={openingBalanceStatusLabel(params.row.status)} />
      ),
    },
    { field: 'totalDebit', headerName: 'Debit', width: 110, type: 'number' },
    { field: 'totalCredit', headerName: 'Credit', width: 110, type: 'number' },
    {
      field: 'postedAt',
      headerName: 'Posted',
      width: 110,
      valueGetter: (_v, row) => (row.postedAt ? row.postedAt.slice(0, 10) : '—'),
    },
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
    />
  );
}
