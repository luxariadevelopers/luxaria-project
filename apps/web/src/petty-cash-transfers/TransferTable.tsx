import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import type { PettyCashTransferCapabilities } from './roleAccess';
import { TransferStatusChip } from './TransferStatusChip';
import type { PublicPettyCashFundTransfer } from './types';
import { resolveTransferRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicPettyCashFundTransfer[];
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
  caps: PettyCashTransferCapabilities;
  requestLabel: (id: string) => string;
  onVerify?: (row: PublicPettyCashFundTransfer) => void;
  onPost?: (row: PublicPettyCashFundTransfer) => void;
  onCancel?: (row: PublicPettyCashFundTransfer) => void;
  onProof?: (row: PublicPettyCashFundTransfer) => void;
};

export function TransferTable({
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
  requestLabel,
  onVerify,
  onPost,
  onCancel,
  onProof,
}: Props) {
  const columns: GridColDef<PublicPettyCashFundTransfer>[] = [
    {
      field: 'transferNumber',
      headerName: 'Number',
      width: 150,
    },
    {
      field: 'requestId',
      headerName: 'Request',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => requestLabel(row.requestId),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.amount),
    },
    {
      field: 'transactionReference',
      headerName: 'Txn ref',
      width: 140,
      valueGetter: (_v, row) => row.transactionReference ?? '—',
    },
    {
      field: 'transferDate',
      headerName: 'Transfer date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.transferDate),
    },
    {
      field: 'paymentProof',
      headerName: 'Proof',
      width: 90,
      valueGetter: (_v, row) => (row.paymentProof?.trim() ? 'Yes' : '—'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <TransferStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicPettyCashFundTransfer>[] = [];

  if (onProof && caps.canFund) {
    rowActions.push({
      id: 'proof',
      label: 'Payment proof',
      onClick: onProof,
      disabled: (row) =>
        !resolveTransferRowActions(row, caps).includes('proof'),
    });
  }
  if (onVerify && caps.canVerify) {
    rowActions.push({
      id: 'verify',
      label: 'Verify',
      onClick: onVerify,
      disabled: (row) =>
        !resolveTransferRowActions(row, caps).includes('verify'),
    });
  }
  if (onPost && caps.canPost) {
    rowActions.push({
      id: 'post',
      label: 'Post to accounting',
      onClick: onPost,
      disabled: (row) =>
        !resolveTransferRowActions(row, caps).includes('post'),
    });
  }
  if (onCancel && caps.canCancel) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      onClick: onCancel,
      disabled: (row) =>
        !resolveTransferRowActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Fund transfers"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No fund transfers"
      emptyDescription="Record a transfer against an approved petty-cash request to fund the site float."
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
      searchPlaceholder="Search transfer number…"
      preferencesKey="petty-cash-fund-transfers-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      mobileCard={{
        primaryField: 'transferNumber',
        metaFields: ['amount', 'transferDate'],
        statusField: 'status',
      }}
    />
  );
}
