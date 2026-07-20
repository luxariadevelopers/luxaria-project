import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { CancellationStatusChip } from './CancellationStatusChip';
import type { BookingCancellationCapabilities } from './roleAccess';
import type { PublicBookingCancellation } from './types';
import { resolveCancellationActions } from './workflowActions';

type Props = {
  rows: readonly PublicBookingCancellation[];
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
  caps: BookingCancellationCapabilities;
  onOpen?: (row: PublicBookingCancellation) => void;
  onReview?: (row: PublicBookingCancellation) => void;
  onSubmitApproval?: (row: PublicBookingCancellation) => void;
  onApprove?: (row: PublicBookingCancellation) => void;
  onReject?: (row: PublicBookingCancellation) => void;
  onProcessRefund?: (row: PublicBookingCancellation) => void;
  onReleaseUnit?: (row: PublicBookingCancellation) => void;
};

export function CancellationTable({
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
  onOpen,
  onReview,
  onSubmitApproval,
  onApprove,
  onReject,
  onProcessRefund,
  onReleaseUnit,
}: Props) {
  const columns: GridColDef<PublicBookingCancellation>[] = [
    {
      field: 'cancellationNumber',
      headerName: 'Cancellation #',
      width: 160,
    },
    {
      field: 'cancellationDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.cancellationDate),
    },
    {
      field: 'bookingId',
      headerName: 'Booking',
      width: 140,
      valueGetter: (_v, row) => `…${row.bookingId.slice(-8)}`,
    },
    {
      field: 'totalReceived',
      headerName: 'Received',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.totalReceived),
    },
    {
      field: 'approvedRefund',
      headerName: 'Refund',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.approvedRefund),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <CancellationStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicBookingCancellation>[] = [];

  if (onOpen) {
    rowActions.push({ id: 'open', label: 'Open', onClick: onOpen });
  }
  if (onReview && caps.canReview) {
    rowActions.push({
      id: 'review',
      label: 'Review',
      onClick: onReview,
      disabled: (row) =>
        !resolveCancellationActions(row, caps).includes('review'),
    });
  }
  if (onSubmitApproval && caps.canSubmitApproval) {
    rowActions.push({
      id: 'submit_approval',
      label: 'Submit approval',
      onClick: onSubmitApproval,
      disabled: (row) =>
        !resolveCancellationActions(row, caps).includes('submit_approval'),
    });
  }
  if (onApprove && caps.canApprove) {
    rowActions.push({
      id: 'approve',
      label: 'Approve',
      onClick: onApprove,
      disabled: (row) =>
        !resolveCancellationActions(row, caps).includes('approve'),
    });
  }
  if (onReject && caps.canReject) {
    rowActions.push({
      id: 'reject',
      label: 'Reject',
      onClick: onReject,
      disabled: (row) =>
        !resolveCancellationActions(row, caps).includes('reject'),
    });
  }
  if (onProcessRefund && caps.canRefund) {
    rowActions.push({
      id: 'process_refund',
      label: 'Process refund',
      onClick: onProcessRefund,
      disabled: (row) =>
        !resolveCancellationActions(row, caps).includes('process_refund'),
    });
  }
  if (onReleaseUnit && caps.canReleaseUnit) {
    rowActions.push({
      id: 'release_unit',
      label: 'Release unit',
      onClick: onReleaseUnit,
      disabled: (row) =>
        !resolveCancellationActions(row, caps).includes('release_unit'),
    });
  }

  return (
    <DataTable
      title="Cancellations & refunds"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No cancellations"
      emptyDescription="Request a booking cancellation to start the refund and unit-release workflow."
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
      searchPlaceholder="Search cancellation #"
      preferencesKey="booking-cancellations-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={onOpen ? (params) => onOpen(params.row) : undefined}
    />
  );
}
