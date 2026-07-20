import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { CancellationDetailDrawer } from '@/booking-cancellations/CancellationDetailDrawer';
import {
  CancellationFilters,
  type CancellationFilterState,
} from '@/booking-cancellations/CancellationFilters';
import { CancellationForm } from '@/booking-cancellations/CancellationForm';
import { CancellationTable } from '@/booking-cancellations/CancellationTable';
import { ProcessRefundDialog } from '@/booking-cancellations/ProcessRefundDialog';
import { RejectCancellationDialog } from '@/booking-cancellations/RejectCancellationDialog';
import { ReviewCancellationDialog } from '@/booking-cancellations/ReviewCancellationDialog';
import { resolveBookingCancellationCapabilities } from '@/booking-cancellations/roleAccess';
import type {
  BookingCancellationStatus,
  PublicBookingCancellation,
} from '@/booking-cancellations/types';
import {
  useApproveBookingCancellation,
  useBankAccountOptions,
  useBookingCancellationsList,
  useCancellableBookings,
  useReleaseCancellationUnit,
  useSubmitCancellationApproval,
} from '@/booking-cancellations/useBookingCancellations';

/**
 * Booking cancellations & refunds — `/sales/cancellations` (Micro Phase 106).
 *
 * Nest: `/booking-cancellations`
 * Permissions: `booking.view` · `booking.cancel` · `booking.approve` · `collection.refund`
 *
 * Unit release only after approved workflow (and refund when due).
 */
export function CancellationsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBookingCancellationCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CancellationFilterState>({
    status: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRow, setDetailRow] =
    useState<PublicBookingCancellation | null>(null);
  const [reviewRow, setReviewRow] =
    useState<PublicBookingCancellation | null>(null);
  const [rejectRow, setRejectRow] =
    useState<PublicBookingCancellation | null>(null);
  const [refundRow, setRefundRow] =
    useState<PublicBookingCancellation | null>(null);
  const [approveRow, setApproveRow] =
    useState<PublicBookingCancellation | null>(null);
  const [releaseRow, setReleaseRow] =
    useState<PublicBookingCancellation | null>(null);
  const [submitRow, setSubmitRow] =
    useState<PublicBookingCancellation | null>(null);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as
        | BookingCancellationStatus
        | undefined,
    }),
    [page, pageSize, projectId, search, filters.status],
  );

  const list = useBookingCancellationsList(
    listQuery,
    canView && Boolean(projectId),
  );
  const bookings = useCancellableBookings(
    projectId,
    canView && Boolean(projectId) && caps.canRequest,
  );
  const banks = useBankAccountOptions(
    canView && caps.canRefund && caps.canViewBankAccounts,
  );

  const submitApproval = useSubmitCancellationApproval();
  const approve = useApproveBookingCancellation();
  const releaseUnit = useReleaseCancellationUnit();

  const rows = list.data?.items ?? [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Cancellations unavailable"
        message="You need the booking.view permission to manage cancellations and refunds."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Cancellations denied"
        message="You do not have access to booking cancellations for this project."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Booking cancellations and customer refunds
        {selectedProject ? ` — ${selectedProject.projectName}` : ''}.
        Units stay unavailable until the approved workflow finishes (refund
        when due, then release). Select a project in the header.
      </Typography>

      <CancellationTable
        rows={rows}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? rows.length}
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
          <CancellationFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canRequest ? (
            <Button
              variant="contained"
              disabled={!projectId}
              onClick={() => setCreateOpen(true)}
            >
              Request cancellation
            </Button>
          ) : undefined
        }
        caps={caps}
        onOpen={setDetailRow}
        onReview={setReviewRow}
        onSubmitApproval={setSubmitRow}
        onApprove={setApproveRow}
        onReject={setRejectRow}
        onProcessRefund={setRefundRow}
        onReleaseUnit={setReleaseRow}
      />

      {caps.canRequest ? (
        <CancellationForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          bookings={bookings.data ?? []}
        />
      ) : null}

      <CancellationDetailDrawer
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        row={detailRow}
        caps={caps}
        onReview={() => {
          setReviewRow(detailRow);
        }}
        onSubmitApproval={() => setSubmitRow(detailRow)}
        onApprove={() => setApproveRow(detailRow)}
        onReject={() => setRejectRow(detailRow)}
        onProcessRefund={() => setRefundRow(detailRow)}
        onReleaseUnit={() => setReleaseRow(detailRow)}
      />

      <ReviewCancellationDialog
        open={Boolean(reviewRow)}
        onClose={() => setReviewRow(null)}
        row={reviewRow}
      />
      <RejectCancellationDialog
        open={Boolean(rejectRow)}
        onClose={() => setRejectRow(null)}
        row={rejectRow}
      />
      <ProcessRefundDialog
        open={Boolean(refundRow)}
        onClose={() => setRefundRow(null)}
        row={refundRow}
        bankAccounts={banks.data ?? []}
        canViewBankAccounts={caps.canViewBankAccounts}
      />

      <ConfirmDialog
        open={Boolean(submitRow)}
        title="Submit for approval"
        description={
          submitRow
            ? `Submit ${submitRow.cancellationNumber} for approval?`
            : ''
        }
        confirmLabel="Submit"
        loading={submitApproval.isPending}
        onCancel={() => setSubmitRow(null)}
        onConfirm={() => {
          if (!submitRow) return;
          void (async () => {
            try {
              await submitApproval.mutateAsync(submitRow.id);
              success('Submitted for approval');
              setSubmitRow(null);
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />

      <ConfirmDialog
        open={Boolean(approveRow)}
        title="Approve cancellation"
        description={
          approveRow
            ? `Approve ${approveRow.cancellationNumber}? Refund ${approveRow.approvedRefund} will become payable; the unit is not released yet.`
            : ''
        }
        confirmLabel="Approve"
        loading={approve.isPending}
        onCancel={() => setApproveRow(null)}
        onConfirm={() => {
          if (!approveRow) return;
          void (async () => {
            try {
              await approve.mutateAsync({ id: approveRow.id });
              success('Cancellation approved');
              setApproveRow(null);
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />

      <ConfirmDialog
        open={Boolean(releaseRow)}
        title="Release unit"
        description={
          releaseRow
            ? `Release the unit for ${releaseRow.cancellationNumber}? This cancels the booking and restores availability. Nest blocks release before the approved workflow${
                releaseRow.approvedRefund > 0 ? ' and refund' : ''
              }.`
            : ''
        }
        confirmLabel="Release unit"
        loading={releaseUnit.isPending}
        onCancel={() => setReleaseRow(null)}
        onConfirm={() => {
          if (!releaseRow) return;
          void (async () => {
            try {
              await releaseUnit.mutateAsync(releaseRow.id);
              success('Unit released — booking cancelled');
              setReleaseRow(null);
              setDetailRow(null);
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />
    </Stack>
  );
}
