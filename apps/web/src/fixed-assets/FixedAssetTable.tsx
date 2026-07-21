import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import {
  fixedAssetCategoryLabel,
  fixedAssetStatusLabel,
} from './labels';
import type { FixedAssetListRow } from './types';

type Props = {
  rows: readonly FixedAssetListRow[];
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

export function FixedAssetTable({
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
  const columns: GridColDef<FixedAssetListRow>[] = [
    { field: 'assetNumber', headerName: 'Asset #', width: 120 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'category',
      headerName: 'Category',
      width: 140,
      valueGetter: (_v, row) => fixedAssetCategoryLabel(row.category),
    },
    {
      field: 'capitalizationDate',
      headerName: 'Capitalized',
      width: 120,
      valueGetter: (_v, row) => row.capitalizationDate.slice(0, 10),
    },
    { field: 'grossBlock', headerName: 'Gross', width: 110, type: 'number' },
    { field: 'netBlock', headerName: 'Net block', width: 110, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={fixedAssetStatusLabel(params.row.status)} />
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
