import { useEffect, useMemo, useState } from 'react';
import { Alert, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import {
  applyApiFieldErrors,
  DateInput,
  FormSection,
  FormTextField,
} from '@/components/forms';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import { buildPettyCashRequestTimeline } from '@/petty-cash-requests/buildRequestTimeline';
import { CurrentBalanceCard } from '@/petty-cash-requests/CurrentBalanceCard';
import { PettyCashRequestStatusChip } from '@/petty-cash-requests/PettyCashRequestStatusChip';
import { RequirementItemsGrid } from '@/petty-cash-requests/RequirementItemsGrid';
import { ReviewActionDialog } from '@/petty-cash-requests/ReviewActionDialog';
import { resolvePettyCashRequestCapabilities } from '@/petty-cash-requests/roleAccess';
import {
  useCancelPettyCashRequirement,
  useCashAccountBalance,
  useFinanceApprovePettyCashRequirement,
  usePettyCashRequirementDetail,
  usePmApprovePettyCashRequirement,
  useRejectPettyCashRequirement,
  useReturnPettyCashRequirement,
  useSubmitPettyCashRequirement,
  useUpdatePettyCashRequirement,
} from '@/petty-cash-requests/usePettyCashRequests';
import {
  defaultPettyCashRequestValues,
  pettyCashRequestFormSchema,
  shapeUpdatePayload,
  type PettyCashRequestFormValues,
} from '@/petty-cash-requests/validation';
import {
  isPettyCashRequestEditable,
  resolvePettyCashRequestActions,
} from '@/petty-cash-requests/workflowActions';
import { WorkflowTimeline } from '@/workflow-timeline';

type ReviewMode =
  | 'pm_approve'
  | 'finance_approve'
  | 'reject'
  | 'return'
  | null;

/**
 * Petty-cash request detail — `/accounting/petty-cash/requests/:requestId`
 * (Micro Phase 049).
 *
 * Nest: GET detail · PATCH · submit/cancel · PM/finance approve · reject/return
 * Permissions: petty_cash.view / request / approve
 */
export function PettyCashRequestDetailPage() {
  const { requestId = '' } = useParams<{ requestId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolvePettyCashRequestCapabilities(hasPermission);
  const { selectedProjectId, projects } = useProject();
  const { success, error: notifyError } = useNotify();
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = usePettyCashRequirementDetail(
    requestId || null,
    canView,
  );
  const row = detailQuery.data;

  const update = useUpdatePettyCashRequirement();
  const submit = useSubmitPettyCashRequirement();
  const cancel = useCancelPettyCashRequirement();
  const pmApprove = usePmApprovePettyCashRequirement();
  const financeApprove = useFinanceApprovePettyCashRequirement();
  const reject = useRejectPettyCashRequirement();
  const returnReq = useReturnPettyCashRequirement();

  const editable = row ? isPettyCashRequestEditable(row.status) : false;
  const canEdit = editable && caps.canRequest;

  const balanceQuery = useCashAccountBalance(
    row?.pettyCashAccountId ?? null,
    Boolean(row?.pettyCashAccountId) && caps.canViewCash,
  );

  const { control, handleSubmit, reset, setError } =
    useForm<PettyCashRequestFormValues>({
      resolver: zodResolver(pettyCashRequestFormSchema),
      defaultValues: defaultPettyCashRequestValues(),
      mode: 'onBlur',
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'requirementItems',
  });

  useEffect(() => {
    if (!row) return;
    reset({
      projectId: row.projectId,
      pettyCashAccountId: row.pettyCashAccountId,
      weekStartDate: row.weekStartDate,
      weekEndDate: row.weekEndDate,
      justification: row.justification,
      requirementItems: row.requirementItems.map((item) => ({
        expenseCategory: item.expenseCategory,
        description: item.description,
        estimatedAmount: item.estimatedAmount,
      })),
    });
  }, [row, reset]);

  const projectLabel = useMemo(() => {
    if (!row) return '—';
    const p = projects.find((x) => x.id === row.projectId);
    if (!p) return row.projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [row, projects]);

  const summaryFields = useMemo(() => {
    if (!row) return [];
    return [
      {
        id: 'week',
        label: 'Week',
        value: `${formatDate(row.weekStartDate)} – ${formatDate(row.weekEndDate)}`,
      },
      {
        id: 'createdBy',
        label: 'Created by',
        value: row.requestedByName || '—',
      },
      {
        id: 'requested',
        label: 'Requested',
        value: formatInr(row.requestedAmount),
      },
      {
        id: 'approvedBy',
        label: 'Approved by',
        value: row.approvedByName || '—',
      },
      {
        id: 'approved',
        label: 'Approved amount',
        value:
          row.approvedAmount != null ? formatInr(row.approvedAmount) : '—',
      },
      {
        id: 'balance',
        label: 'Snapshot balance',
        value: formatInr(row.currentCashBalance),
      },
      {
        id: 'unsettled',
        label: 'Previous unsettled',
        value: formatInr(row.previousUnsettledAmount),
      },
      {
        id: 'project',
        label: 'Project',
        value: projectLabel,
      },
    ];
  }, [row, projectLabel]);

  const allowed = row
    ? resolvePettyCashRequestActions(row, caps)
    : [];

  const busy =
    update.isPending ||
    submit.isPending ||
    cancel.isPending ||
    pmApprove.isPending ||
    financeApprove.isPending ||
    reject.isPending ||
    returnReq.isPending;

  const saveDraft = async (values: PettyCashRequestFormValues) => {
    if (!row) return;
    try {
      await update.mutateAsync({
        id: row.id,
        input: shapeUpdatePayload(values),
      });
      success('Request updated');
      await detailQuery.refetch();
    } catch (err) {
      applyApiFieldErrors(setError, err);
      notifyError(getErrorMessage(err));
    }
  };

  const saveAndSubmit = async (values: PettyCashRequestFormValues) => {
    if (!row) return;
    try {
      await update.mutateAsync({
        id: row.id,
        input: shapeUpdatePayload(values),
      });
      await submit.mutateAsync(row.id);
      success('Request submitted for approval');
      await detailQuery.refetch();
    } catch (err) {
      applyApiFieldErrors(setError, err);
      notifyError(getErrorMessage(err));
    }
  };

  const actions: EntityDetailAction[] = row
    ? [
        {
          id: 'save',
          label: 'Save',
          permission: 'petty_cash.request',
          allowedStatuses: ['draft', 'returned'],
          onClick: () => {
            void handleSubmit(saveDraft)();
          },
          loading: update.isPending,
          disabled: !allowed.includes('save') || busy,
        },
        {
          id: 'submit',
          label: 'Submit',
          permission: 'petty_cash.request',
          allowedStatuses: ['draft', 'returned'],
          variant: 'contained',
          onClick: () => {
            void handleSubmit(saveAndSubmit)();
          },
          loading: submit.isPending || update.isPending,
          disabled: !allowed.includes('submit') || busy,
        },
        {
          id: 'pm_approve',
          label: 'PM approve',
          permission: 'petty_cash.approve',
          allowedStatuses: ['submitted', 'project_manager_review'],
          color: 'success',
          onClick: () => setReviewMode('pm_approve'),
          disabled: !allowed.includes('pm_approve') || busy,
        },
        {
          id: 'finance_approve',
          label: 'Finance approve',
          permission: 'petty_cash.approve',
          allowedStatuses: ['finance_review'],
          color: 'success',
          variant: 'contained',
          onClick: () => setReviewMode('finance_approve'),
          disabled: !allowed.includes('finance_approve') || busy,
        },
        {
          id: 'return',
          label: 'Return',
          permission: 'petty_cash.approve',
          allowedStatuses: [
            'submitted',
            'project_manager_review',
            'finance_review',
          ],
          color: 'warning',
          onClick: () => setReviewMode('return'),
          disabled: !allowed.includes('return') || busy,
        },
        {
          id: 'reject',
          label: 'Reject',
          permission: 'petty_cash.approve',
          allowedStatuses: [
            'submitted',
            'project_manager_review',
            'finance_review',
          ],
          color: 'error',
          onClick: () => setReviewMode('reject'),
          disabled: !allowed.includes('reject') || busy,
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'petty_cash.request',
          allowedStatuses: ['draft', 'returned'],
          color: 'error',
          variant: 'outlined',
          onClick: () => {
            void (async () => {
              try {
                await cancel.mutateAsync(row.id);
                success('Request cancelled');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: cancel.isPending,
          disabled: !allowed.includes('cancel') || busy,
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () => (row ? buildPettyCashRequestTimeline(row) : []),
    [row],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Petty-cash request unavailable"
        message="You need the petty_cash.view permission to open this request."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Petty-cash request denied"
        message="The server denied access to this request (403)."
      />
    );
  }

  if (
    row &&
    selectedProjectId &&
    row.projectId !== selectedProjectId
  ) {
    return (
      <PermissionDenied
        title="Wrong project"
        message="This request belongs to another project. Switch the active project in the header."
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
          !detailQuery.isLoading && !detailQuery.error && !row
        }
        permissionTitle="Petty-cash request unavailable"
        permissionMessage="You need the petty_cash.view permission to open this request."
        notFoundTitle="Request not found"
        notFoundDescription="This request id is invalid or was removed."
        header={
          row ? (
            <DetailHeader
              title="Petty-cash request"
              code={row.requestNumber}
              subtitle={`Week ${formatDate(row.weekStartDate)} – ${formatDate(row.weekEndDate)}`}
              backTo="/accounting/petty-cash/requests"
              backLabel="Requests"
              meta={<PettyCashRequestStatusChip status={row.status} />}
            />
          ) : undefined
        }
        actionBar={
          row ? (
            <EntityActionBar
              actions={actions}
              status={row.status}
              hasPermission={hasPermission}
              emptyHint="No workflow actions for this status and your permissions."
            />
          ) : undefined
        }
        summary={
          row ? <SummaryCards fields={summaryFields} /> : undefined
        }
        timeline={
          row ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              title="Approval timeline"
            />
          ) : undefined
        }
      >
        {row ? (
          <Stack
            spacing={2.5}
            component="form"
            noValidate
            data-testid="petty-cash-request-detail-body"
            onSubmit={(e) => {
              e.preventDefault();
              if (canEdit) void handleSubmit(saveDraft)();
            }}
          >
            {row.approvalRequestId ? (
              <Alert severity="info" variant="outlined">
                Linked approval{' '}
                <Link
                  component={RouterLink}
                  to={`/approvals/${row.approvalRequestId}`}
                  underline="hover"
                >
                  {row.approvalRequestId}
                </Link>
              </Alert>
            ) : null}

            {row.rejectionReason ? (
              <Alert severity="warning" variant="outlined">
                {row.rejectionReason}
              </Alert>
            ) : null}

            <CurrentBalanceCard
              request={row}
              liveBalance={balanceQuery.data ?? null}
              liveLoading={balanceQuery.isLoading}
              liveErrorMessage={
                balanceQuery.error
                  ? getErrorMessage(balanceQuery.error)
                  : null
              }
            />

            {canEdit ? (
              <FormSection title="Week">
                <DateInput
                  name="weekStartDate"
                  control={control}
                  label="Week start"
                  required
                  disabled={busy}
                />
                <DateInput
                  name="weekEndDate"
                  control={control}
                  label="Week end"
                  required
                  disabled={busy}
                />
              </FormSection>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Week dates are locked in status{' '}
                <strong>{row.status}</strong>.
              </Typography>
            )}

            <RequirementItemsGrid
              control={control}
              fields={fields}
              append={append}
              remove={remove}
              disabled={busy}
              readOnly={!canEdit}
            />

            {canEdit ? (
              <FormSection title="Justification">
                <FormTextField
                  name="justification"
                  control={control}
                  label="Justification"
                  required
                  multiline
                  minRows={3}
                  disabled={busy}
                />
              </FormSection>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="subtitle1">Justification</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {row.justification}
                </Typography>
              </Stack>
            )}
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <ReviewActionDialog
        open={reviewMode === 'pm_approve'}
        title="Project manager approve"
        confirmLabel="Approve"
        loading={pmApprove.isPending}
        onClose={() => setReviewMode(null)}
        onConfirm={async ({ comment }) => {
          if (!row) return;
          try {
            await pmApprove.mutateAsync({ id: row.id, input: { comment } });
            success('PM approval recorded');
            await detailQuery.refetch();
          } catch (err) {
            notifyError(getErrorMessage(err));
            throw err;
          }
        }}
      />

      <ReviewActionDialog
        open={reviewMode === 'finance_approve'}
        title="Finance approve"
        confirmLabel="Approve"
        loading={financeApprove.isPending}
        showApprovedAmount
        defaultApprovedAmount={row?.requestedAmount ?? 0}
        onClose={() => setReviewMode(null)}
        onConfirm={async ({ comment, approvedAmount }) => {
          if (!row) return;
          try {
            await financeApprove.mutateAsync({
              id: row.id,
              input: { comment, approvedAmount },
            });
            success('Finance approval recorded');
            await detailQuery.refetch();
          } catch (err) {
            notifyError(getErrorMessage(err));
            throw err;
          }
        }}
      />

      <ReviewActionDialog
        open={reviewMode === 'reject'}
        title="Reject request"
        confirmLabel="Reject"
        loading={reject.isPending}
        onClose={() => setReviewMode(null)}
        onConfirm={async ({ comment }) => {
          if (!row) return;
          try {
            await reject.mutateAsync({ id: row.id, input: { comment } });
            success('Request rejected');
            await detailQuery.refetch();
          } catch (err) {
            notifyError(getErrorMessage(err));
            throw err;
          }
        }}
      />

      <ReviewActionDialog
        open={reviewMode === 'return'}
        title="Return for correction"
        confirmLabel="Return"
        loading={returnReq.isPending}
        onClose={() => setReviewMode(null)}
        onConfirm={async ({ comment }) => {
          if (!row) return;
          try {
            await returnReq.mutateAsync({ id: row.id, input: { comment } });
            success('Request returned');
            await detailQuery.refetch();
          } catch (err) {
            notifyError(getErrorMessage(err));
            throw err;
          }
        }}
      />
    </>
  );
}
