import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDateTime, formatQuantity } from '@/format';
import {
  materialUnitLabel,
  stockReservationSourceLabel,
} from './labels';
import type { StockReservationCapabilities } from './roleAccess';
import { StockReservationStatusChip } from './StockReservationStatusChip';
import {
  StockReservationStatus,
  type PublicStockReservation,
} from './types';

type Props = {
  rows: readonly PublicStockReservation[];
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
  caps: StockReservationCapabilities;
  onOpenDetail?: (row: PublicStockReservation) => void;
  onRelease?: (row: PublicStockReservation) => void;
  onCancel?: (row: PublicStockReservation) => void;
};

export function StockReservationTable({
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
  onOpenDetail,
  onRelease,
  onCancel,
}: Props) {
  const columns: GridColDef<PublicStockReservation>[] = [
    {
      field: 'reservationNumber',
      headerName: 'Reservation',
      width: 150,
    },
    {
      field: 'materialId',
      headerName: 'Material',
      width: 160,
      valueGetter: (_v, row) => row.materialId.slice(-8),
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 140,
      valueGetter: (_v, row) => row.location || '—',
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      width: 120,
      valueGetter: (_v, row) =>
        `${formatQuantity(row.quantity)} ${materialUnitLabel(row.unit)}`,
    },
    {
      field: 'remainingBaseQuantity',
      headerName: 'Remaining (base)',
      width: 140,
      valueGetter: (_v, row) => formatQuantity(row.remainingBaseQuantity),
    },
    {
      field: 'sourceType',
      headerName: 'Source',
      width: 140,
      valueGetter: (_v, row) => stockReservationSourceLabel(row.sourceType),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <StockReservationStatusChip status={params.row.status} />
      ),
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 150,
      valueGetter: (_v, row) =>
        row.expiresAt ? formatDateTime(row.expiresAt) : '—',
    },
  ];

  const rowActions: DataTableRowAction<PublicStockReservation>[] = [];

  if (onOpenDetail) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpenDetail,
    });
  }
  if (onRelease && caps.canReserve) {
    rowActions.push({
      id: 'release',
      label: 'Release',
      onClick: onRelease,
      disabled: (row) => row.status !== StockReservationStatus.Active,
    });
  }
  if (onCancel && caps.canReserve) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      onClick: onCancel,
      danger: true,
      disabled: (row) => row.status !== StockReservationStatus.Active,
    });
  }

  return (
    <DataTable<PublicStockReservation>
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
      emptyTitle="No stock reservations"
      emptyDescription="Reserve available stock as a soft hold for DPR, contractors, or manual planning."
      preferencesKey="stock-reservations-list"
      onRowClick={
        onOpenDetail ? (params) => onOpenDetail(params.row) : undefined
      }
    />
  );
}
