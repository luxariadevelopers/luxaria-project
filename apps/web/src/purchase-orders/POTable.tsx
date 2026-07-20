import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { POStatusChip } from './POStatusChip';
import { computeReceivedAmount } from './receivedValue';
import type { PurchaseOrderCapabilities } from './roleAccess';
import type { PublicPurchaseOrder } from './types';

type Props = {
  rows: readonly PublicPurchaseOrder[];
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
  toolbarActions?: ReactNode;
  caps: PurchaseOrderCapabilities;
  /** Open `/procurement/purchase-orders/:id` (Micro Phase 067). */
  onOpenDetail?: (row: PublicPurchaseOrder) => void;
};

export function POTable({
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
  toolbarActions,
  caps,
  onOpenDetail,
}: Props) {
  const columns: GridColDef<PublicPurchaseOrder>[] = [
    {
      field: 'purchaseOrderNumber',
      headerName: 'PO number',
      width: 150,
    },
    {
      field: 'revisionNumber',
      headerName: 'Rev',
      width: 70,
      type: 'number',
    },
    {
      field: 'vendorId',
      headerName: 'Vendor',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.vendorId,
    },
    {
      field: 'orderDate',
      headerName: 'Order date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.orderDate),
    },
    {
      field: 'expectedDeliveryDate',
      headerName: 'Expected',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.expectedDeliveryDate),
    },
    {
      field: 'total',
      headerName: 'PO value',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.total),
    },
    {
      field: 'receivedAmount',
      headerName: 'Received',
      width: 130,
      sortable: false,
      valueGetter: (_v, row) =>
        formatInr(computeReceivedAmount(row.total, row.balanceAmount)),
    },
    {
      field: 'balanceAmount',
      headerName: 'Balance',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.balanceAmount),
    },
    {
      field: 'deliveryStatus',
      headerName: 'Delivery',
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <DeliveryStatusBadge status={params.row.status} />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <POStatusChip status={params.row.status} />,
    },
  ];

  const rowActions: DataTableRowAction<PublicPurchaseOrder>[] = [];
  if (onOpenDetail && caps.canView) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpenDetail,
    });
  }

  return (
    <DataTable
      title="Purchase orders"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No purchase orders"
      emptyDescription="Create a purchase order or adjust filters."
      height={520}
      getRowId={(row) => row.id}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search PO number…"
      preferencesKey="purchase-orders-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={
        onOpenDetail ? (params) => onOpenDetail(params.row) : undefined
      }
    />
  );
}
