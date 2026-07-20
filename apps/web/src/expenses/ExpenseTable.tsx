import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Stack } from '@mui/material';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { DuplicateWarningBadge } from './DuplicateWarningBadge';
import { EvidenceCount } from './EvidenceCount';
import { ExpenseStatusChip } from './ExpenseStatusChip';
import { GpsWarningBadge } from './GpsWarningBadge';
import { paymentModeLabel } from './labels';
import type { ExpenseCapabilities } from './roleAccess';
import type { PublicSiteExpenseVoucher } from './types';
import { resolveExpenseRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicSiteExpenseVoucher[];
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
  caps: ExpenseCapabilities;
  onVerify?: (row: PublicSiteExpenseVoucher) => void;
  onApprove?: (row: PublicSiteExpenseVoucher) => void;
  onPost?: (row: PublicSiteExpenseVoucher) => void;
};

export function ExpenseTable({
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
  onVerify,
  onApprove,
  onPost,
}: Props) {
  const columns: GridColDef<PublicSiteExpenseVoucher>[] = [
    {
      field: 'voucherNumber',
      headerName: 'Voucher',
      width: 150,
    },
    {
      field: 'expenseDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.expenseDate),
    },
    {
      field: 'paidTo',
      headerName: 'Paid to',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.amount),
    },
    {
      field: 'paymentMode',
      headerName: 'Mode',
      width: 110,
      valueGetter: (_v, row) => paymentModeLabel(row.paymentMode),
    },
    {
      field: 'attachments',
      headerName: 'Evidence',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <EvidenceCount attachments={params.row.attachments} />
      ),
    },
    {
      field: 'warnings',
      headerName: 'Risk',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center', py: 0.5 }}
          data-testid="expense-warnings-cell"
        >
          <DuplicateWarningBadge warnings={params.row.warnings} />
          <GpsWarningBadge warnings={params.row.warnings} />
        </Stack>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <ExpenseStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicSiteExpenseVoucher>[] = [];

  if (onVerify && caps.canVerify) {
    rowActions.push({
      id: 'verify',
      label: 'Verify',
      onClick: onVerify,
      disabled: (row) =>
        !resolveExpenseRowActions(row, caps).includes('verify'),
    });
  }
  if (onApprove && caps.canApprove) {
    rowActions.push({
      id: 'approve',
      label: 'Approve',
      onClick: onApprove,
      disabled: (row) =>
        !resolveExpenseRowActions(row, caps).includes('approve'),
    });
  }
  if (onPost && caps.canPost) {
    rowActions.push({
      id: 'post',
      label: 'Post to accounting',
      onClick: onPost,
      disabled: (row) => !resolveExpenseRowActions(row, caps).includes('post'),
    });
  }

  return (
    <DataTable
      title="Site expenses"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No site expenses"
      emptyDescription="Submit site expense vouchers from mobile, or adjust date / status filters."
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
      searchPlaceholder="Search voucher or payee…"
      preferencesKey="site-expenses-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
