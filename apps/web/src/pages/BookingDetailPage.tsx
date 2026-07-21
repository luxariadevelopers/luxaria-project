import { useMemo, useState } from 'react';
import { Alert, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import { unitDetailPath } from '@/units/paths';
import { WorkflowTimeline } from '@/workflow-timeline';
import { ApproveBookingDiscountDialog } from '@/bookings/ApproveBookingDiscountDialog';
import { buildBookingTimeline } from '@/bookings/buildBookingTimeline';
import { CancelBookingDialog } from '@/bookings/CancelBookingDialog';
import { describeHoldExpiry } from '@/bookings/holdExpiry';
import { bookingStatusLabel, fundingTypeLabel } from '@/bookings/labels';
import { BOOKING_ROUTES } from '@/bookings/routes';
import { RejectBookingDiscountDialog } from '@/bookings/RejectBookingDiscountDialog';
import { resolveBookingCapabilities } from '@/bookings/roleAccess';
import { BookingStatusChip } from '@/bookings/BookingStatusChip';
import { TransitionBookingDialog } from '@/bookings/TransitionBookingDialog';
import { useBookingDetail } from '@/bookings/useBookings';
import { useBookingLookups } from '@/bookings/useBookingLookups';
import {
  resolveBookingDetailActions,
  transitionActionLabel,
  type BookingActionId,
} from '@/bookings/workflowActions';

/**
 * Booking detail & workflow — `/sales/bookings/:bookingId`.
 * Nest: GET detail · transition · approve/reject discount · cancel
 */
export function BookingDetailPage() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveBookingCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [transitionAction, setTransitionAction] =
    useState<BookingActionId | null>(null);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useBookingDetail(
    bookingId || undefined,
    canView && projectReady,
  );
  const booking = detailQuery.data;

  const labels = useBookingLookups(booking ? [booking] : [], {
    projectId: selectedProjectId,
    canViewUnits: hasPermission('unit.view'),
    canViewCustomers: hasPermission('customer.view'),
  });

  const allowed = booking
    ? resolveBookingDetailActions(booking, caps)
    : [];

  const summaryFields = useMemo(() => {
    if (!booking) return [];
    const hold = describeHoldExpiry({
      status: booking.status,
      holdExpiresAt: booking.holdExpiresAt,
      expiredAt: booking.expiredAt,
    });
    return [
      {
        id: 'customer',
        label: 'Customer',
        value:
          labels.customers.get(booking.customerId) ??
          booking.customerId.slice(-6),
      },
      {
        id: 'unit',
        label: 'Unit',
        value: labels.units.get(booking.unitId) ?? booking.unitId.slice(-6),
      },
      {
        id: 'bookingAmount',
        label: 'Booking amount',
        value: formatInr(booking.bookingAmount),
      },
      {
        id: 'agreedPrice',
        label: 'Agreed price',
        value: formatInr(booking.agreedPrice),
      },
      {
        id: 'discount',
        label: 'Discount',
        value: formatInr(booking.discount),
      },
      {
        id: 'approvedPrice',
        label: 'Approved price',
        value: formatInr(booking.approvedPrice),
      },
      {
        id: 'funding',
        label: 'Funding',
        value: fundingTypeLabel(booking.fundingType),
      },
      {
        id: 'bookingDate',
        label: 'Booking date',
        value: formatDate(booking.bookingDate),
      },
      {
        id: 'holdExpiry',
        label: 'Hold expiry',
        value: hold.label,
      },
    ];
  }, [booking, labels]);

  const actions: EntityDetailAction[] = useMemo(() => {
    if (!booking) return [];
    const transitionIds: BookingActionId[] = [
      'transition_reserved',
      'transition_booked',
      'transition_agreement',
      'transition_registered',
    ];

    const list: EntityDetailAction[] = [];

    if (allowed.includes('approve_discount')) {
      list.push({
        id: 'approve_discount',
        label: transitionActionLabel('approve_discount'),
        permission: 'booking.approve',
        allowedStatuses: ['pending_approval'],
        variant: 'contained',
        color: 'success',
        onClick: () => setApproveOpen(true),
      });
    }

    if (allowed.includes('reject_discount')) {
      list.push({
        id: 'reject_discount',
        label: transitionActionLabel('reject_discount'),
        permission: 'booking.approve',
        allowedStatuses: ['pending_approval'],
        color: 'error',
        variant: 'outlined',
        onClick: () => setRejectOpen(true),
      });
    }

    for (const id of transitionIds) {
      if (!allowed.includes(id)) continue;
      list.push({
        id,
        label: transitionActionLabel(id),
        permission: 'booking.create',
        allowedStatuses: [
          'hold',
          'reserved',
          'booked',
          'agreement',
        ],
        variant: id === 'transition_registered' ? 'contained' : 'outlined',
        onClick: () => setTransitionAction(id),
      });
    }

    if (allowed.includes('cancel')) {
      list.push({
        id: 'cancel',
        label: transitionActionLabel('cancel'),
        permission: 'booking.create',
        allowedStatuses: ['hold', 'pending_approval', 'reserved'],
        color: 'error',
        variant: 'outlined',
        onClick: () => setCancelOpen(true),
      });
    }

    return list;
  }, [booking, allowed]);

  const timelineEvents = useMemo(
    () => (booking ? buildBookingTimeline(booking) : []),
    [booking],
  );

  const refetchDetail = () => void detailQuery.refetch();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Booking unavailable"
        message="You need booking.view to open bookings."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Booking denied"
      />
    );
  }

  if (
    booking &&
    selectedProjectId &&
    booking.projectId !== selectedProjectId
  ) {
    return (
      <PermissionDenied
        title="Wrong project"
        message="This booking belongs to another project. Switch the active project in the header."
        showHomeLink={false}
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={projectReady}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={refetchDetail}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !booking
        }
        permissionTitle="Booking unavailable"
        permissionMessage="You need booking.view to open this booking."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project in the header before opening a booking."
        notFoundTitle="Booking not found"
        notFoundDescription="This booking may belong to another project, or the id is invalid."
        header={
          booking ? (
            <DetailHeader
              title={booking.bookingNumber}
              subtitle={bookingStatusLabel(booking.status)}
              backTo={BOOKING_ROUTES.list}
              backLabel="Bookings"
              meta={
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <BookingStatusChip status={booking.status} />
                </Stack>
              }
            />
          ) : undefined
        }
        actionBar={
          booking ? (
            <EntityActionBar
              actions={actions}
              status={booking.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={
          booking ? <SummaryCards fields={summaryFields} /> : undefined
        }
        timeline={
          booking ? (
            <WorkflowTimeline events={timelineEvents} canView={canView} />
          ) : undefined
        }
      >
        {booking ? (
          <Stack spacing={3}>
            {booking.discountApprovalRequired &&
            !booking.discountApproved &&
            booking.status === 'pending_approval' ? (
              <Alert severity="warning">
                Discount exceeds policy limits — approve with{' '}
                <code>booking.approve</code> before marking reserved.
              </Alert>
            ) : null}

            {booking.remarks ? (
              <Typography variant="body2" color="text.secondary">
                Remarks: {booking.remarks}
              </Typography>
            ) : null}

            <Typography variant="subtitle2">Unit</Typography>
            <Link
              component={RouterLink}
              to={unitDetailPath(booking.unitId)}
              underline="hover"
            >
              {labels.units.get(booking.unitId) ?? booking.unitId}
            </Link>
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <ApproveBookingDiscountDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        booking={booking ?? null}
        onDone={refetchDetail}
      />
      <RejectBookingDiscountDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        booking={booking ?? null}
        onDone={refetchDetail}
      />
      <TransitionBookingDialog
        open={Boolean(transitionAction)}
        onClose={() => setTransitionAction(null)}
        booking={booking ?? null}
        action={transitionAction}
        onDone={refetchDetail}
      />
      <CancelBookingDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        booking={booking ?? null}
        onDone={refetchDetail}
      />
    </>
  );
}
