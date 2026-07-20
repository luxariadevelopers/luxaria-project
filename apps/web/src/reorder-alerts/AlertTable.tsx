import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatDateTime } from '@/format';
import { AlertSeverityChip } from './AlertSeverityChip';
import {
  materialUnitLabel,
  reorderAlertStatusLabel,
  reorderAlertTypeLabel,
} from './labels';
import type { ReorderAlertCapabilities } from './roleAccess';
import type { PublicStockReorderAlert } from './types';

type Props = {
  rows: readonly PublicStockReorderAlert[];
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
  caps: ReorderAlertCapabilities;
  onCreatePurchaseOrder?: (row: PublicStockReorderAlert) => void;
};

/**
 * Actionable reorder / stock-out alert table.
 * Columns: severity, stock-out date, pending PO, recommended qty.
 */
export function AlertTable({
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
  onCreatePurchaseOrder,
}: Props) {
  const columns: GridColDef<PublicStockReorderAlert>[] = [
    {
      field: 'severity',
      headerName: 'Severity',
      width: 110,
      renderCell: (params) => (
        <AlertSeverityChip alertType={params.row.alertType} />
      ),
      sortable: false,
    },
    {
      field: 'materialCode',
      headerName: 'Material',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) =>
        [row.materialCode, row.materialName].filter(Boolean).join(' · ') ||
        row.materialId,
    },
    {
      field: 'alertType',
      headerName: 'Alert',
      width: 170,
      valueGetter: (_v, row) => reorderAlertTypeLabel(row.alertType),
    },
    {
      field: 'availableStock',
      headerName: 'On hand',
      width: 110,
      valueGetter: (_v, row) =>
        `${row.availableStock} ${materialUnitLabel(row.baseUnit)}`,
    },
    {
      field: 'pendingPoQuantity',
      headerName: 'Pending PO',
      width: 120,
      valueGetter: (_v, row) =>
        `${row.pendingPoQuantity} ${materialUnitLabel(row.baseUnit)}`,
    },
    {
      field: 'estimatedStockOutDate',
      headerName: 'Stock-out date',
      width: 130,
      valueGetter: (_v, row) =>
        row.estimatedStockOutDate
          ? formatDate(row.estimatedStockOutDate)
          : '—',
    },
    {
      field: 'recommendedPurchaseQuantity',
      headerName: 'Recommended qty',
      width: 140,
      valueGetter: (_v, row) =>
        `${row.recommendedPurchaseQuantity} ${materialUnitLabel(row.baseUnit)}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      valueGetter: (_v, row) => reorderAlertStatusLabel(row.status),
    },
    {
      field: 'evaluatedAt',
      headerName: 'Evaluated',
      width: 150,
      valueGetter: (_v, row) => formatDateTime(row.evaluatedAt),
    },
  ];

  const rowActions: DataTableRowAction<PublicStockReorderAlert>[] = [];
  if (onCreatePurchaseOrder && caps.canCreatePurchaseOrder) {
    rowActions.push({
      id: 'create_po',
      label: 'Create PO',
      onClick: onCreatePurchaseOrder,
      disabled: (row) => row.recommendedPurchaseQuantity <= 0,
    });
  }

  return (
    <DataTable
      title="Reorder Alerts"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No reorder alerts"
      emptyDescription="Open alerts for this project will appear after forecast evaluation."
      height={520}
      getRowId={(row) => row.id}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      preferencesKey="reorder-alerts-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
