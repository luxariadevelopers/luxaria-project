import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { materialUnitLabel } from './labels';
import { LowStockIndicator } from './LowStockIndicator';
import { formatBaseQuantity, formatQtyNumber } from './units';
import type { StockBalanceRow } from './types';

type Props = {
  rows: readonly StockBalanceRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterSlot?: ReactNode;
  /** When set, location column shows the active filter; otherwise “All”. */
  locationScope: string;
};

export function StockTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  filterSlot,
  locationScope,
}: Props) {
  const columns: GridColDef<StockBalanceRow>[] = [
    {
      field: 'materialCode',
      headerName: 'Code',
      width: 120,
      valueGetter: (_v, row) => row.materialCode ?? '—',
    },
    {
      field: 'materialName',
      headerName: 'Material',
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) => row.materialName ?? '—',
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 140,
      valueGetter: (_v, row) =>
        row.location || locationScope || 'All locations',
    },
    {
      field: 'quantityInBaseUnit',
      headerName: 'On hand (base)',
      width: 160,
      valueGetter: (_v, row) =>
        formatBaseQuantity(row.quantityInBaseUnit, row.baseUnit),
    },
    {
      field: 'baseUnit',
      headerName: 'Base unit',
      width: 110,
      valueGetter: (_v, row) => materialUnitLabel(row.baseUnit),
    },
    {
      field: 'reorderLevel',
      headerName: 'Reorder',
      width: 100,
      valueGetter: (_v, row) => formatQtyNumber(row.reorderLevel),
    },
    {
      field: 'minimumStock',
      headerName: 'Minimum',
      width: 100,
      valueGetter: (_v, row) => formatQtyNumber(row.minimumStock),
    },
    {
      field: 'pendingPoQuantity',
      headerName: 'Pending PO (base)',
      width: 140,
      valueGetter: (_v, row) =>
        formatBaseQuantity(row.pendingPoQuantity, row.baseUnit),
    },
    {
      field: 'stockStatus',
      headerName: 'Status',
      width: 110,
      sortable: false,
      renderCell: (params) => <LowStockIndicator row={params.row} />,
    },
  ];

  return (
    <DataTable<StockBalanceRow>
      title="Stock balances"
      rows={[...rows]}
      columns={columns}
      getRowId={(row) => `${row.projectId}:${row.materialId}:${row.location}`}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No stock balances"
      emptyDescription="No on-hand quantities for this project with the current filters. Ledger movements are not listed here."
      height={520}
      paginationMode="client"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search material code or name…"
      preferencesKey="stock-balances-list"
      filterSlot={filterSlot}
    />
  );
}
