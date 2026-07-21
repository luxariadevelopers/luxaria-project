import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { GridColDef } from '@mui/x-data-grid';
import { Link } from '@mui/material';
import { DataTable } from '@/components/DataTable';
import {
  formatDate,
  formatInr,
  scheduleTypeLabel,
} from './labels';
import { paymentScheduleDetailPath } from './paths';
import { PaymentScheduleStatusChip } from './PaymentScheduleStatusChip';
import type { PaymentScheduleRelatedLabels, PublicPaymentSchedule } from './types';

type Props = {
  rows: readonly PublicPaymentSchedule[];
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
  labels?: PaymentScheduleRelatedLabels;
};

export function PaymentScheduleTable({
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
  labels,
}: Props) {
  const columns: GridColDef<PublicPaymentSchedule>[] = [
    {
      field: 'scheduleNumber',
      headerName: 'Schedule',
      width: 150,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={paymentScheduleDetailPath(params.row.id)}
          underline="hover"
        >
          {params.row.scheduleNumber}
        </Link>
      ),
    },
    {
      field: 'bookingId',
      headerName: 'Booking',
      width: 140,
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
      field: 'unitId',
      headerName: 'Unit',
      width: 110,
      valueGetter: (_v, row) =>
        labels?.units.get(row.unitId) ?? row.unitId.slice(-6),
    },
    {
      field: 'scheduleType',
      headerName: 'Type',
      width: 170,
      valueGetter: (_v, row) => scheduleTypeLabel(row.scheduleType),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.totalAmount),
    },
    {
      field: 'revisionNumber',
      headerName: 'Rev',
      width: 70,
    },
    {
      field: 'overdueLineCount',
      headerName: 'Overdue',
      width: 90,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <PaymentScheduleStatusChip status={params.row.status} />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.createdAt),
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
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Schedule number…"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      emptyTitle="No payment schedules"
      emptyDescription="Generate a schedule from an eligible booking."
      getRowId={(row) => row.id}
    />
  );
}
