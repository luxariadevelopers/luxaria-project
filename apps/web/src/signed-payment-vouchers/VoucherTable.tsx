import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { SIGNED_PAYMENT_VOUCHER_ROUTES } from './routes';
import type { SignedPaymentVoucherCapabilities } from './roleAccess';
import type { PublicSignedPaymentVoucher } from './types';
import { VoucherStatusChip } from './VoucherStatusChip';
import { resolveSignedPaymentVoucherRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicSignedPaymentVoucher[];
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
  caps: SignedPaymentVoucherCapabilities;
  onApprove?: (row: PublicSignedPaymentVoucher) => void;
  onPost?: (row: PublicSignedPaymentVoucher) => void;
};

export function VoucherTable({
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
  onApprove,
  onPost,
}: Props) {
  const navigate = useNavigate();

  const columns: GridColDef<PublicSignedPaymentVoucher>[] = [
    {
      field: 'voucherNumber',
      headerName: 'Voucher',
      width: 150,
    },
    {
      field: 'capturedAt',
      headerName: 'Captured',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.capturedAt),
    },
    {
      field: 'recipientName',
      headerName: 'Recipient',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'workDescription',
      headerName: 'Work',
      flex: 1.2,
      minWidth: 160,
    },
    {
      field: 'netAmount',
      headerName: 'Net',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.netAmount),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <VoucherStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicSignedPaymentVoucher>[] = [];

  if (onApprove && caps.canApprove) {
    rowActions.push({
      id: 'approve',
      label: 'Approve',
      onClick: onApprove,
      disabled: (row) =>
        !resolveSignedPaymentVoucherRowActions(row, caps).includes('approve'),
    });
  }
  if (onPost && caps.canApprove) {
    rowActions.push({
      id: 'post',
      label: 'Post',
      onClick: onPost,
      disabled: (row) =>
        !resolveSignedPaymentVoucherRowActions(row, caps).includes('post'),
    });
  }

  return (
    <DataTable
      title="Signed payment vouchers"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No signed payment vouchers"
      emptyDescription="Labour vouchers are captured on mobile. Adjust status filters or select a project."
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
      searchPlaceholder="Search voucher, recipient, or work…"
      preferencesKey="signed-payment-vouchers-list"
      filterSlot={filterSlot}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={(params) =>
        navigate(SIGNED_PAYMENT_VOUCHER_ROUTES.detail(params.row.id))
      }
    />
  );
}
