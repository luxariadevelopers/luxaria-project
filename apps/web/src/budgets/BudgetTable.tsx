import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { budgetStatusLabel } from './labels';
import type { BudgetListRow } from './types';

type Props = {
  rows: readonly BudgetListRow[];
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
};

export function BudgetTable({
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
}: Props) {
  const columns: GridColDef<BudgetListRow>[] = [
    { field: 'budgetNumber', headerName: 'Budget #', width: 120 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'financialYearId',
      headerName: 'Financial year',
      width: 140,
      valueGetter: (_v, row) => fyLabel?.(row.financialYearId) ?? row.financialYearId.slice(-6),
    },
    { field: 'version', headerName: 'Ver', width: 70, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip size="small" label={budgetStatusLabel(params.row.status)} />
      ),
    },
    { field: 'totalAmount', headerName: 'Total', width: 120, type: 'number' },
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
