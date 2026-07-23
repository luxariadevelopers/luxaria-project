import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Link, Typography } from '@mui/material';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { unitDetailPath } from '@/units/paths';
import { bookingDetailPath } from './paths';
import { BookingStatusChip } from './BookingStatusChip';
import {
  describeHoldExpiry,
  isExpiredOrLapsedHold,
  type HoldExpiryDisplay,
} from './holdExpiry';
import { fundingTypeLabel } from './labels';
import type { BookingRelatedLabels, PublicBooking } from './types';

type Props = {
  rows: readonly PublicBooking[];
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
  labels?: BookingRelatedLabels;
  onRowClick?: (params: GridRowParams<PublicBooking>) => void;
};

function HoldExpiryCell({ display }: { display: HoldExpiryDisplay }) {
  const emphasize = isExpiredOrLapsedHold(display) || display.tone === 'invalid';
  const color =
    display.tone === 'expired' || display.tone === 'lapsed'
      ? 'error.main'
      : display.tone === 'invalid'
        ? 'warning.main'
        : 'text.primary';
  return (
    <Typography
      variant="body2"
      sx={{ color, fontWeight: emphasize ? 600 : 400 }}
      data-testid="booking-hold-expiry"
      data-tone={display.tone}
      title={display.detail}
    >
      {display.label}
    </Typography>
  );
}

export function BookingTable({
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
  onRowClick,
}: Props) {
  const columns: GridColDef<PublicBooking>[] = [
    {
      field: 'bookingNumber',
      headerName: 'Booking',
      width: 150,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={bookingDetailPath(params.row.id)}
          underline="hover"
          onClick={(e) => e.stopPropagation()}
          data-testid="booking-detail-link"
        >
          {params.row.bookingNumber}
        </Link>
      ),
    },
    {
      field: 'unitId',
      headerName: 'Unit',
      width: 130,
      renderCell: (params) => {
        const label =
          labels?.units.get(params.row.unitId) ?? params.row.unitId.slice(-6);
        return (
          <Link
            component={RouterLink}
            to={unitDetailPath(params.row.unitId)}
            underline="hover"
            data-testid="booking-unit-link"
          >
            {label}
          </Link>
        );
      },
    },
    {
      field: 'customerId',
      headerName: 'Customer',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) =>
        labels?.customers.get(row.customerId) ?? row.customerId.slice(-6),
    },
    {
      field: 'bookingAmount',
      headerName: 'Booking amt',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.bookingAmount),
    },
    {
      field: 'approvedPrice',
      headerName: 'Approved',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.approvedPrice),
    },
    {
      field: 'fundingType',
      headerName: 'Funding',
      width: 120,
      valueGetter: (_v, row) => fundingTypeLabel(row.fundingType),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <BookingStatusChip status={params.row.status} />,
    },
    {
      field: 'holdExpiresAt',
      headerName: 'Hold expiry',
      width: 200,
      renderCell: (params) => (
        <HoldExpiryCell
          display={describeHoldExpiry({
            status: params.row.status,
            holdExpiresAt: params.row.holdExpiresAt,
            expiredAt: params.row.expiredAt,
          })}
        />
      ),
    },
    {
      field: 'bookingDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) =>
        row.bookingDate ? formatDate(row.bookingDate) : '—',
    },
  ];

  return (
    <DataTable
      title="Bookings"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No bookings"
      emptyDescription="Holds, reservations and bookings for this project will appear here."
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
      searchPlaceholder="Search booking number…"
      preferencesKey="sales-bookings-list"
      mobileCard={{
        primaryField: 'bookingNumber',
        metaFields: ['bookingAmount', 'bookingDate'],
        statusField: 'status',
      }}
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      onRowClick={onRowClick}
    />
  );
}
