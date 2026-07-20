import { useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  BookingFilters,
  type BookingFilterState,
} from '@/bookings/BookingFilters';
import { BookingTable } from '@/bookings/BookingTable';
import { resolveBookingCapabilities } from '@/bookings/roleAccess';
import { useBookingLookups } from '@/bookings/useBookingLookups';
import { useBookingsList } from '@/bookings/useBookings';

/**
 * Bookings list — `/sales/bookings` (Micro Phase 101).
 *
 * Nest: `GET /bookings` (`booking.view`).
 * Tracks holds, reservations and bookings for the selected project.
 */
export function BookingsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBookingCapabilities(hasPermission);
  const { selectedProjectId, isLoading: projectLoading } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<BookingFilterState>({
    status: '',
  });

  const canView = Boolean(access) && caps.canView;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      search: search.trim() || undefined,
      status: filters.status || undefined,
    }),
    [page, pageSize, search, filters, selectedProjectId],
  );

  const enabled = canView && Boolean(selectedProjectId);
  const list = useBookingsList(listQuery, enabled);
  const rows = list.data?.items ?? [];

  const labels = useBookingLookups(rows, {
    projectId: selectedProjectId,
    canViewUnits: hasPermission('unit.view'),
    canViewCustomers: hasPermission('customer.view'),
  });

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Bookings unavailable"
        message="You need booking.view to track unit holds, reservations and bookings."
      />
    );
  }

  if (projectLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose a project in the header to track unit commitments for that site."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="bookings-page">
      <Stack spacing={0.5}>
        <Typography variant="h4">Bookings</Typography>
        <Typography color="text.secondary">
          Track unit holds, reservations and bookings — status, funding and hold
          expiry for the selected project.
        </Typography>
      </Stack>

      <BookingTable
        rows={rows}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
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
