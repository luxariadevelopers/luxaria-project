import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  CreateStockReservationDrawer,
  ReservationDetailDrawer,
  resolveStockReservationCapabilities,
  StockReservationFilters,
  StockReservationTable,
  type PublicStockReservation,
  type StockReservationFilterState,
  type StockReservationSourceType,
  type StockReservationStatus,
  useCancelStockReservation,
  useReleaseStockReservation,
  useStockReservationsList,
} from '@/stock-reservations';

/**
 * Stock reservations list — `/inventory/stock-reservations`.
 */
export function StockReservationsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveStockReservationCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<StockReservationFilterState>({
    status: '',
    sourceType: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<PublicStockReservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as StockReservationStatus | undefined,
      sourceType: (filters.sourceType || undefined) as
        | StockReservationSourceType
        | undefined,
    }),
    [filters, page, pageSize, selectedProjectId],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useStockReservationsList(listQuery, enabled);
  const release = useReleaseStockReservation();
  const cancel = useCancelStockReservation();

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      success(label);
      await list.refetch();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Stock reservations unavailable"
        message="You need the stock.view permission to review stock reservations."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list stock reservations."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Stock reservations denied"
        message="You do not have permission to load stock reservations for this project."
      />
    );
  }

  const openDetail = (row: PublicStockReservation) => {
    setSelected(row);
    setDetailOpen(true);
  };

  return (
    <Stack spacing={2} data-testid="stock-reservations-page">
      <PageHeader
        subtitle="Soft-hold available stock for DPR, contractors, or manual planning. Release or cancel active reservations without posting ledger movements."
      />

      <StockReservationTable
        rows={list.data?.items ?? []}
        loading={list.isLoading}
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
        filterSlot={
          <StockReservationFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canReserve ? (
            <Button
              variant="contained"
              onClick={() => setCreateOpen(true)}
              data-testid="stock-reservation-create"
            >
              Reserve stock
            </Button>
          ) : undefined
        }
        caps={caps}
        onOpenDetail={openDetail}
        onRelease={(row) =>
          void runAction('Reservation released', () =>
            release.mutateAsync({ id: row.id }),
          )
        }
        onCancel={(row) =>
          void runAction('Reservation cancelled', () =>
            cancel.mutateAsync(row.id),
          )
        }
      />

      <CreateStockReservationDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        onCreated={(id) => {
          void list.refetch().then(() => {
            const row = list.data?.items.find((item) => item.id === id);
            if (row) openDetail(row);
          });
        }}
      />

      <ReservationDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        reservation={selected}
        caps={caps}
        onChanged={() => void list.refetch()}
      />
    </Stack>
  );
}
