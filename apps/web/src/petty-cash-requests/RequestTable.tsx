import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { PettyCashRequestStatusChip } from './PettyCashRequestStatusChip';
import { UnsettledAmountIndicator } from './UnsettledAmountIndicator';
import type { PettyCashRequestCapabilities } from './roleAccess';
import type { PublicPettyCashRequirement } from './types';
import { resolvePettyCashRequestRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicPettyCashRequirement[];
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
  caps: PettyCashRequestCapabilities;
  accountLabel: (id: string) => string;
  onSubmit?: (row: PublicPettyCashRequirement) => void;
  onPmApprove?: (row: PublicPettyCashRequirement) => void;
  onFinanceApprove?: (row: PublicPettyCashRequirement) => void;
  onReject?: (row: PublicPettyCashRequirement) => void;
  onReturn?: (row: PublicPettyCashRequirement) => void;
  onFund?: (row: PublicPettyCashRequirement) => void;
  onClose?: (row: PublicPettyCashRequirement) => void;
  onCancel?: (row: PublicPettyCashRequirement) => void;
};

export function RequestTable({
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
  accountLabel,
  onSubmit,
  onPmApprove,
  onFinanceApprove,
  onReject,
  onReturn,
  onFund,
  onClose,
  onCancel,
}: Props) {
  const columns: GridColDef<PublicPettyCashRequirement>[] = [
    {
      field: 'requestNumber',
      headerName: 'Number',
      width: 150,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={`/accounting/petty-cash/requests/${params.row.id}`}
          underline="hover"
        >
          {params.row.requestNumber}
        </Link>
      ),
    },
    {
      field: 'weekStartDate',
      headerName: 'Week',
      width: 200,
      valueGetter: (_v, row) =>
        `${formatDate(row.weekStartDate)} – ${formatDate(row.weekEndDate)}`,
    },
    {
      field: 'pettyCashAccountId',
      headerName: 'Account',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => accountLabel(row.pettyCashAccountId),
    },
    {
      field: 'requestedByName',
      headerName: 'Created by',
      width: 150,
      valueGetter: (_v, row) => row.requestedByName || '—',
    },
    {
      field: 'requestedAmount',
      headerName: 'Requested',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.requestedAmount),
    },
    {
      field: 'approvedByName',
      headerName: 'Approved by',
      width: 150,
      valueGetter: (_v, row) => row.approvedByName || '—',
    },
    {
      field: 'approvedAmount',
      headerName: 'Approved amt',
      width: 120,
      valueGetter: (_v, row) =>
        row.approvedAmount == null ? '—' : formatInr(row.approvedAmount),
    },
    {
      field: 'previousUnsettledAmount',
      headerName: 'Unsettled',
      width: 160,
      renderCell: (params) => (
        <UnsettledAmountIndicator
          previousUnsettledAmount={params.row.previousUnsettledAmount}
          warnings={params.row.warnings}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <PettyCashRequestStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicPettyCashRequirement>[] = [];

  if (onSubmit && caps.canRequest) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes('submit'),
    });
  }
  if (onPmApprove && caps.canApprove) {
    rowActions.push({
      id: 'pm_approve',
      label: 'PM review',
      onClick: onPmApprove,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes('pm_approve'),
    });
  }
  if (onFinanceApprove && caps.canApprove) {
    rowActions.push({
      id: 'finance_approve',
      label: 'Finance approve',
      onClick: onFinanceApprove,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes(
          'finance_approve',
        ),
    });
  }
  if (onReject && caps.canApprove) {
    rowActions.push({
      id: 'reject',
      label: 'Reject',
      danger: true,
      onClick: onReject,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes('reject'),
    });
  }
  if (onReturn && caps.canApprove) {
    rowActions.push({
      id: 'return',
      label: 'Return',
      onClick: onReturn,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes('return'),
    });
  }
  if (onFund && caps.canFund) {
    rowActions.push({
      id: 'fund',
      label: 'Fund',
      onClick: onFund,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes('fund'),
    });
  }
  if (onClose && caps.canFund) {
    rowActions.push({
      id: 'close',
      label: 'Close',
      onClick: onClose,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes('close'),
    });
  }
  if (onCancel && caps.canRequest) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      danger: true,
      onClick: onCancel,
      disabled: (row) =>
        !resolvePettyCashRequestRowActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Fund requests"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No fund requests"
      emptyDescription="Create a weekly petty-cash request or adjust filters."
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
      searchPlaceholder="Search request number…"
      preferencesKey="petty-cash-requests-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
