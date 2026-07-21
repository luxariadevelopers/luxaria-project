import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { GridColDef } from '@mui/x-data-grid';
import { Link } from '@mui/material';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from './labels';
import { paymentScheduleDetailPath } from './paths';
import { PaymentScheduleLineStatusChip } from './PaymentScheduleLineStatusChip';
import type { OverdueScheduleLineRow, PaymentScheduleRelatedLabels } from './types';

type Props = {
  rows: readonly OverdueScheduleLineRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  toolbarActions?: ReactNode;
  labels?: PaymentScheduleRelatedLabels;
};

export function OverdueLinesTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  toolbarActions,
  labels,
}: Props) {
  const columns: GridColDef<OverdueScheduleLineRow>[] = [
    {
      field: 'scheduleNumber',
      headerName: 'Schedule',
      width: 140,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={paymentScheduleDetailPath(params.row.scheduleId)}
          underline="hover"
        >
          {params.row.scheduleNumber}
        </Link>
      ),
    },
    {
      field: 'bookingId',
      headerName: 'Booking',
      width: 130,
      valueGetter: (_v, row) =>
        labels?.bookings.get(row.bookingId) ?? row.bookingId.slice(-8),
    },
    {
      field: 'customerId',
      headerName: 'Customer',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) =>
        labels?.customers.get(row.customerId) ?? row.customerId.slice(-8),
    },
    {
      field: 'milestone',
      headerName: 'Milestone',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.line.milestone,
    },
    {
      field: 'dueDate',
      headerName: 'Due',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.line.dueDate),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.line.amount + row.line.tax),
    },
    {
      field: 'status',
      headerName: 'Line status',
      width: 120,
      renderCell: (params) => (
        <PaymentScheduleLineStatusChip status={params.row.line.status} />
      ),
    },
    {
      field: 'overdueAt',
      headerName: 'Overdue since',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.line.overdueAt),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      toolbarActions={toolbarActions}
      emptyTitle="No overdue lines"
      emptyDescription="Active schedule lines past due date appear here."
      getRowId={(row) => `${row.scheduleId}:${row.line.id}`}
    />
  );
}
