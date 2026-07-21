import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { costCentreKindLabel, costCentreStatusLabel } from './labels';
import type { CostCentreListRow } from './types';

type Props = {
  rows: readonly CostCentreListRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
  projectLabel?: (projectId: string | null) => string;
};

export function CostCentreTable({
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
  projectLabel,
}: Props) {
  const columns: GridColDef<CostCentreListRow>[] = [
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'kind',
      headerName: 'Kind',
      width: 130,
      valueGetter: (_v, row) => costCentreKindLabel(row.kind),
    },
    {
      field: 'projectId',
      headerName: 'Project',
      width: 160,
      valueGetter: (_v, row) =>
        row.projectId ? (projectLabel?.(row.projectId) ?? row.projectId.slice(-6)) : 'Company',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={costCentreStatusLabel(params.row.status)} />
      ),
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
