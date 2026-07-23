import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import { GrnStatusChip } from './GrnStatusChip';
import type { GrnCapabilities } from './roleAccess';
import type { PublicGoodsReceipt } from './types';
import { resolveGrnRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicGoodsReceipt[];
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
  caps: GrnCapabilities;
  onOpenDetail?: (row: PublicGoodsReceipt) => void;
  onQualityCheck?: (row: PublicGoodsReceipt) => void;
  onAccept?: (row: PublicGoodsReceipt) => void;
  onPost?: (row: PublicGoodsReceipt) => void;
};

export function GrnTable({
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
  caps,
  onOpenDetail,
  onQualityCheck,
  onAccept,
  onPost,
}: Props) {
  const columns: GridColDef<PublicGoodsReceipt>[] = [
    {
      field: 'grnNumber',
      headerName: 'GRN',
      width: 150,
    },
    {
      field: 'purchaseOrderId',
      headerName: 'PO id',
      width: 140,
      valueGetter: (_v, row) => row.purchaseOrderId,
    },
    {
      field: 'vendorId',
      headerName: 'Vendor id',
      width: 140,
    },
    {
      field: 'deliveryChallanNumber',
      headerName: 'Challan',
      width: 130,
      valueGetter: (_v, row) => row.deliveryChallanNumber ?? '—',
    },
    {
      field: 'receivedDate',
      headerName: 'Received',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.receivedDate),
    },
    {
      field: 'itemCount',
      headerName: 'Lines',
      width: 80,
      valueGetter: (_v, row) => row.items?.length ?? 0,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => <GrnStatusChip status={params.row.status} />,
    },
  ];

  const rowActions: DataTableRowAction<PublicGoodsReceipt>[] = [];

  if (onOpenDetail) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpenDetail,
    });
  }
  if (onQualityCheck && caps.canQc) {
    rowActions.push({
      id: 'quality_check',
      label: 'Start QC',
      onClick: onQualityCheck,
      disabled: (row) =>
        !resolveGrnRowActions(row, caps).includes('quality_check'),
    });
  }
  if (onAccept && caps.canAccept) {
    rowActions.push({
      id: 'accept',
      label: 'Accept',
      onClick: onAccept,
      disabled: (row) =>
        !resolveGrnRowActions(row, caps).includes('accept'),
    });
  }
  if (onPost && caps.canPost) {
    rowActions.push({
      id: 'post',
      label: 'Post to stock',
      onClick: onPost,
      disabled: (row) => !resolveGrnRowActions(row, caps).includes('post'),
    });
  }

  return (
    <DataTable
      title="Goods Receipts"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No goods receipts"
      emptyDescription="Mobile or web receipts for this project will appear here."
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
      searchPlaceholder="Search GRN number…"
      preferencesKey="grns-list"
      filterSlot={filterSlot}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={
        onOpenDetail
          ? (params) => onOpenDetail(params.row)
          : undefined
      }
      mobileCard={{
        primaryField: 'grnNumber',
        metaFields: ['receivedDate', 'deliveryChallanNumber'],
        statusField: 'status',
      }}
    />
  );
}
