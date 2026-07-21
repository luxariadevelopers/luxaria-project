import { useMemo, useState } from 'react';
import { Alert, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import { ApproveScheduleDialog } from '@/payment-schedules/ApproveScheduleDialog';
import { MarkDueDialog } from '@/payment-schedules/MarkDueDialog';
import { scheduleTypeLabel } from '@/payment-schedules/labels';
import { PaymentScheduleLinesTable } from '@/payment-schedules/PaymentScheduleLinesTable';
import { PaymentScheduleStatusChip } from '@/payment-schedules/PaymentScheduleStatusChip';
import {
  PAYMENT_SCHEDULES_LIST_PATH,
  paymentScheduleDetailPath,
} from '@/payment-schedules/paths';
import { RejectScheduleDialog } from '@/payment-schedules/RejectScheduleDialog';
import { RevisePaymentScheduleDialog } from '@/payment-schedules/RevisePaymentScheduleDialog';
import { resolvePaymentScheduleCapabilities } from '@/payment-schedules/roleAccess';
import type { PublicPaymentScheduleLine } from '@/payment-schedules/types';
import { usePaymentScheduleLookups } from '@/payment-schedules/usePaymentScheduleLookups';
import {
  useGeneratePaymentDemand,
  usePaymentScheduleDetail,
  useSubmitPaymentScheduleForApproval,
} from '@/payment-schedules/usePaymentSchedules';
import {
  canApproveSchedule,
  canRejectSchedule,
  canReviseSchedule,
  canSubmitSchedule,
} from '@/payment-schedules/workflowActions';

/**
 * Payment schedule detail — `/sales/payment-schedules/:id`.
 */
export function PaymentScheduleDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolvePaymentScheduleCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotify();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [markDueLine, setMarkDueLine] =
    useState<PublicPaymentScheduleLine | null>(null);
  const [demandTarget, setDemandTarget] =
    useState<PublicPaymentScheduleLine | null>(null);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = usePaymentScheduleDetail(id, canView);
  const submit = useSubmitPaymentScheduleForApproval();
  const generateDemand = useGeneratePaymentDemand();

  const schedule = detailQuery.data;

  const labels = usePaymentScheduleLookups(schedule ? [schedule] : [], {
    projectId: selectedProjectId,
    canViewUnits: caps.canViewUnits,
    canViewCustomers: caps.canViewCustomers,
  });

  const summaryFields = useMemo(() => {
    if (!schedule) return [];
    return [
      {
        id: 'type',
        label: 'Type',
        value: scheduleTypeLabel(schedule.scheduleType),
      },
      {
        id: 'total',
        label: 'Total amount',
        value: formatInr(schedule.totalAmount),
      },
      {
        id: 'revision',
        label: 'Revision',
        value: String(schedule.revisionNumber),
      },
      {
        id: 'booking',
        label: 'Booking',
        value: labels.bookings.get(schedule.bookingId) ?? schedule.bookingId,
      },
      {
        id: 'customer',
        label: 'Customer',
        value:
          labels.customers.get(schedule.customerId) ?? schedule.customerId,
      },
      {
        id: 'unit',
        label: 'Unit',
        value: labels.units.get(schedule.unitId) ?? schedule.unitId,
      },
      {
        id: 'overdue',
        label: 'Overdue lines',
        value: String(schedule.overdueLineCount),
      },
      {
        id: 'created',
        label: 'Created',
        value: formatDate(schedule.createdAt),
      },
    ];
  }, [schedule, labels]);

  const actions: EntityDetailAction[] = useMemo(() => {
    if (!schedule) return [];
    const list: EntityDetailAction[] = [];
    if (canSubmitSchedule(schedule, caps)) {
      list.push({
        id: 'submit',
        label: 'Submit for approval',
        permission: 'collection.create',
        allowedStatuses: ['draft', 'rejected'],
        loading: submit.isPending,
        disabled: submit.isPending,
        onClick: () => setSubmitOpen(true),
      });
    }
    if (canApproveSchedule(schedule, caps)) {
      list.push({
        id: 'approve',
        label: 'Approve',
        permission: 'collection.approve',
        allowedStatuses: ['pending_approval'],
        variant: 'contained',
        color: 'success',
        onClick: () => setApproveOpen(true),
      });
    }
    if (canRejectSchedule(schedule, caps)) {
      list.push({
        id: 'reject',
        label: 'Reject',
        permission: 'collection.approve',
        allowedStatuses: ['pending_approval'],
        color: 'error',
        onClick: () => setRejectOpen(true),
      });
    }
    if (canReviseSchedule(schedule, caps)) {
      list.push({
        id: 'revise',
        label: 'Revise',
        permission: 'collection.create',
        allowedStatuses: ['active'],
        onClick: () => setReviseOpen(true),
      });
    }
    return list;
  }, [schedule, caps, submit.isPending]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Payment schedule unavailable"
        message="You need the collection.view permission to open payment schedules."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Payment schedule denied"
      />
    );
  }

  if (
    schedule &&
    selectedProjectId &&
    schedule.projectId !== selectedProjectId
  ) {
    return (
      <PermissionDenied
        title="Wrong project"
        message="This schedule belongs to another project. Switch the active project in the header."
        showHomeLink={false}
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !schedule
        }
        notFoundTitle="Schedule not found"
        notFoundDescription="This schedule id is invalid or was removed."
        header={
          schedule ? (
            <DetailHeader
              title="Payment schedule"
              code={schedule.scheduleNumber}
              subtitle={scheduleTypeLabel(schedule.scheduleType)}
              backTo={PAYMENT_SCHEDULES_LIST_PATH}
              backLabel="Payment schedules"
              meta={<PaymentScheduleStatusChip status={schedule.status} />}
            />
          ) : undefined
        }
        actionBar={
          schedule ? (
            <EntityActionBar
              actions={actions}
              status={schedule.status}
              hasPermission={hasPermission}
              emptyHint="No workflow actions for this status and your permissions."
            />
          ) : undefined
        }
        summary={
          schedule ? <SummaryCards fields={summaryFields} /> : undefined
        }
      >
        {schedule ? (
          <Stack spacing={2} data-testid="payment-schedule-detail-body">
            {schedule.approvalRequestId ? (
              <Alert severity="info" variant="outlined">
                Linked approval{' '}
                <Link
                  component={RouterLink}
                  to={`/approvals/${schedule.approvalRequestId}`}
                  underline="hover"
                >
                  {schedule.approvalRequestId}
                </Link>
              </Alert>
            ) : null}

            {schedule.revisedFromId ? (
              <Alert severity="info">
                Revision of{' '}
                <Link
                  component={RouterLink}
                  to={paymentScheduleDetailPath(schedule.revisedFromId)}
                  underline="hover"
                >
                  prior schedule
                </Link>
                .
              </Alert>
            ) : null}

            {schedule.remarks ? (
              <Typography color="text.secondary">{schedule.remarks}</Typography>
            ) : null}

            <Typography variant="h6">Installment lines</Typography>
            <PaymentScheduleLinesTable
              schedule={schedule}
              caps={caps}
              actionPending={
                generateDemand.isPending || submit.isPending
              }
              onMarkDue={(line) => setMarkDueLine(line)}
              onGenerateDemand={(line) => setDemandTarget(line)}
            />
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <ApproveScheduleDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        scheduleId={schedule?.id ?? null}
        scheduleNumber={schedule?.scheduleNumber}
      />

      <RejectScheduleDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        scheduleId={schedule?.id ?? null}
        scheduleNumber={schedule?.scheduleNumber}
      />

      <RevisePaymentScheduleDialog
        open={reviseOpen}
        onClose={() => setReviseOpen(false)}
        schedule={schedule ?? null}
        onRevised={(newId) => navigate(paymentScheduleDetailPath(newId))}
      />

      <MarkDueDialog
        open={Boolean(markDueLine)}
        onClose={() => setMarkDueLine(null)}
        scheduleId={schedule?.id ?? null}
        line={markDueLine}
      />

      <ConfirmDialog
        open={submitOpen}
        title="Submit for approval"
        description={
          schedule
            ? `Submit ${schedule.scheduleNumber} for approval?`
            : ''
        }
        confirmLabel="Submit"
        loading={submit.isPending}
        onCancel={() => setSubmitOpen(false)}
        onConfirm={() => {
          if (!schedule) return;
          void (async () => {
            try {
              await submit.mutateAsync(schedule.id);
              success(`${schedule.scheduleNumber} submitted for approval`);
              setSubmitOpen(false);
            } catch (err) {
              notifyError(getErrorMessage(err, 'Submit failed'));
            }
          })();
        }}
      />

      <ConfirmDialog
        open={Boolean(demandTarget)}
        title="Generate demand"
        description={
          demandTarget
            ? `Issue demand for “${demandTarget.milestone}” (seq ${demandTarget.sequence})?`
            : ''
        }
        confirmLabel="Generate demand"
        loading={generateDemand.isPending}
        onCancel={() => setDemandTarget(null)}
        onConfirm={() => {
          if (!schedule || !demandTarget) return;
          void (async () => {
            try {
              const result = await generateDemand.mutateAsync({
                id: schedule.id,
                input: { lineId: demandTarget.id },
              });
              success(`Demand ${result.demand.demandNumber} generated`);
              setDemandTarget(null);
            } catch (err) {
              notifyError(getErrorMessage(err, 'Generate demand failed'));
            }
          })();
        }}
      />
    </>
  );
}
