import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  BookingFilters,
  type BookingFilterState,
} from '@/bookings/BookingFilters';
import { BookingTable } from '@/bookings/BookingTable';
import { resolveBookingCapabilities } from '@/bookings/roleAccess';
import { useBookingLookups } from '@/bookings/useBookingLookups';
import { useBookingsList } from '@/bookings/useBookings';
import type { BookingStatusValue } from '@/bookings/types';

/**
 * Bookings list — `/sales/bookings`.
 * Nest: GET /bookings (`booking.view`). Create/transition UI ships separately.
 */
export function BookingsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBookingCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('id')?.trim() || undefined;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState(focusId ?? '');
  const [filters, setFilters] = useState<BookingFilterState>({ status: '' });

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as BookingStatusValue | undefined,
      projectId: selectedProjectId ?? undefined,
    }),
    [page, pageSize, search, filters, selectedProjectId],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const bookingsQuery = useBookingsList(listQuery, enabled);
  const rows = bookingsQuery.data?.items ?? [];
  const labels = useBookingLookups(rows, {
    projectId: selectedProjectId,
    canViewUnits: hasPermission('unit.view'),
    canViewCustomers: hasPermission('customer.view'),
  });

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Bookings unavailable"
        message="You need the booking.view permission to list bookings."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to review unit bookings."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Unit bookings for the selected project. Create and status transitions
        use booking.create / booking.approve on the API.
      </Typography>

      <BookingTable
        rows={rows}
        loading={bookingsQuery.isLoading || bookingsQuery.isFetching}
        error={bookingsQuery.error}
        onRetry={() => void bookingsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={bookingsQuery.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filterSlot={
          <BookingFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        labels={labels}
      />
    </Stack>
  );
}
