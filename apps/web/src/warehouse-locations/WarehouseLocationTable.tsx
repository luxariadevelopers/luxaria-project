import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatQuantity } from '@/format';
import {
  warehouseLocationLevelLabel,
  warehouseLocationStatusLabel,
} from './labels';
import type { WarehouseLocationCapabilities } from './roleAccess';
import {
  WarehouseLocationStatus,
  type PublicWarehouseLocation,
} from './types';

type Props = {
  rows: readonly PublicWarehouseLocation[];
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
  caps: WarehouseLocationCapabilities;
  warehouseLabelById?: Map<string, string>;
  onEdit?: (row: PublicWarehouseLocation) => void;
};

export function WarehouseLocationTable({
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
  caps,
  warehouseLabelById,
  onEdit,
}: Props) {
  const columns: GridColDef<PublicWarehouseLocation>[] = [
    {
      field: 'locationPath',
      headerName: 'Path',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'code',
      headerName: 'Code',
      width: 100,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'level',
      headerName: 'Level',
      width: 100,
      valueGetter: (_v, row) => warehouseLocationLevelLabel(row.level),
    },
    {
      field: 'warehouseId',
      headerName: 'Warehouse',
      width: 160,
      valueGetter: (_v, row) =>
        warehouseLabelById?.get(row.warehouseId) ?? row.warehouseId.slice(-8),
    },
    {
      field: 'capacity',
      headerName: 'Capacity',
      width: 110,
      valueGetter: (_v, row) =>
        row.capacity == null ? '—' : formatQuantity(row.capacity),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          size="small"
          variant="outlined"
          color={
            params.row.status === WarehouseLocationStatus.Active
              ? 'success'
              : 'default'
          }
          label={warehouseLocationStatusLabel(params.row.status)}
        />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicWarehouseLocation>[] = [];
  if (onEdit && caps.canManage) {
    rowActions.push({
      id: 'edit',
      label: 'Edit',
      onClick: onEdit,
    });
  }

  return (
    <DataTable<PublicWarehouseLocation>
      rows={[...rows]}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      emptyTitle="No warehouse locations"
      emptyDescription="Create zones, racks, and bins under a project warehouse for stock location paths."
      preferencesKey="warehouse-locations-list"
      onRowClick={onEdit && caps.canManage ? (params) => onEdit(params.row) : undefined}
    />
  );
}
