import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import { AmendCommitmentDialog } from '@/commitments/AmendCommitmentDialog';
import { buildCommitmentTimeline } from '@/commitments/buildCommitmentTimeline';
import { CancelCommitmentDialog } from '@/commitments/CancelCommitmentDialog';
import { CommitmentDocumentsPanel } from '@/commitments/CommitmentDocumentsPanel';
import { CommitmentStatusChip } from '@/commitments/CommitmentStatusChip';
import {
  commitmentStatusLabel,
  contributionTypeLabel,
} from '@/commitments/labels';
import { PaymentScheduleTable } from '@/commitments/PaymentScheduleTable';
import { RecordReceiptDialog } from '@/commitments/RecordReceiptDialog';
import { resolveCommitmentCapabilities } from '@/commitments/roleAccess';
import {
  useApproveCommitment,
  useCommitmentDetail,
  useCommitmentHistory,
  useSubmitCommitment,
} from '@/commitments/useCommitments';
import { VersionHistoryTable } from '@/commitments/VersionHistoryTable';
import { resolveCommitmentRowActions } from '@/commitments/workflowActions';
import { WorkflowTimeline } from '@/workflow-timeline';

/**
 * Contribution commitment detail (Micro Phase 038).
 * Route: `/capital/commitments/:commitmentId`
 * APIs: GET detail, GET history by number, submit/approve/amend/cancel/receipts.
 */
export function CommitmentDetailPage() {
  const { commitmentId } = useParams<{ commitmentId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveCommitmentCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');
  const [amendOpen, setAmendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useCommitmentDetail(
    selectedProjectId,
    commitmentId,
    canView && projectReady,
  );
  const commitment = detailQuery.data;

  const historyQuery = useCommitmentHistory(
    selectedProjectId,
    commitment?.commitmentNumber,
    canView && projectReady && Boolean(commitment?.commitmentNumber),
  );

  const submit = useSubmitCommitment(selectedProjectId ?? '');
  const approve = useApproveCommitment(selectedProjectId ?? '');

  const summaryFields = useMemo(() => {
    if (!commitment) return [];
    return [
      {
        id: 'amount',
        label: 'Committed',
        value: formatInr(commitment.commitmentAmount),
      },
      {
        id: 'received',
        label: 'Received',
        value: formatInr(commitment.receivedAmount),
      },
      {
        id: 'pending',
        label: 'Pending',
        value: formatInr(commitment.pendingAmount),
      },
      {
        id: 'type',
        label: 'Contribution type',
        value: contributionTypeLabel(commitment.contributionType),
      },
      {
        id: 'date',
        label: 'Commitment date',
        value: formatDate(commitment.commitmentDate),
      },
      {
        id: 'due',
        label: 'Due date',
        value: commitment.dueDate ? formatDate(commitment.dueDate) : '—',
      },
      {
        id: 'version',
        label: 'Version',
        value: `v${commitment.version}`,
      },
      {
        id: 'participant',
        label: 'Participant id',
        value: commitment.participantId,
      },
    ];
  }, [commitment]);

  const allowed = commitment
    ? resolveCommitmentRowActions(commitment, caps)
    : [];

  const actions: EntityDetailAction[] = commitment
    ? [
        {
          id: 'submit',
          label: 'Submit',
          permission: 'contribution_commitment.submit',
          allowedStatuses: ['draft'],
          onClick: () => {
            void (async () => {
              try {
                await submit.mutateAsync(commitment.id);
                success('Commitment submitted');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: submit.isPending,
          disabled: !allowed.includes('submit'),
        },
        {
          id: 'approve',
          label: 'Approve',
          permission: 'contribution_commitment.approve',
          allowedStatuses: ['submitted'],
          color: 'success',
          onClick: () => {
            void (async () => {
              try {
                await approve.mutateAsync(commitment.id);
                success('Commitment approved');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: approve.isPending,
          disabled: !allowed.includes('approve'),
        },
        {
          id: 'amend',
          label: 'Amend',
          permission: 'contribution_commitment.amend',
          allowedStatuses: ['approved'],
          onClick: () => setAmendOpen(true),
          disabled: !allowed.includes('amend'),
        },
        {
          id: 'record_receipt',
          label: 'Record receipt',
          permission: 'contribution_commitment.record_receipt',
          allowedStatuses: ['approved'],
          onClick: () => setReceiptOpen(true),
          disabled: !allowed.includes('record_receipt'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'contribution_commitment.cancel',
          allowedStatuses: ['draft', 'submitted', 'approved'],
          color: 'error',
          variant: 'outlined',
          onClick: () => setCancelOpen(true),
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () =>
      commitment
        ? buildCommitmentTimeline(commitment, historyQuery.data ?? [])
        : [],
    [commitment, historyQuery.data],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Commitment unavailable"
        message="You need the contribution_commitment.view permission to open this commitment."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Commitment unavailable"
        message="The server denied access to this commitment (403)."
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
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !commitment
        }
        permissionTitle="Commitment unavailable"
        permissionMessage="You need the contribution_commitment.view permission to open this commitment."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project in the header before opening a commitment. Commitments are project-scoped."
        notFoundTitle="Commitment not found"
        notFoundDescription="This commitment may belong to another project, or the id is invalid."
        header={
          commitment ? (
            <DetailHeader
              title={commitment.commitmentNumber}
              code={`v${commitment.version}`}
              subtitle={commitmentStatusLabel(commitment.status)}
              backTo="/capital/commitments"
              backLabel="Commitments"
              meta={
                <CommitmentStatusChip
                  status={commitment.status}
                  row={commitment}
                />
              }
            />
          ) : undefined
        }
        actionBar={
          commitment ? (
            <EntityActionBar
              actions={actions}
              status={commitment.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={
          commitment ? <SummaryCards fields={summaryFields} /> : undefined
        }
        tabs={
          commitment ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  content: (
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        {commitment.remarks?.trim() ||
                          'No remarks on this version.'}
                      </Typography>
                      <PaymentScheduleTable
                        lines={commitment.paymentSchedule}
                      />
                    </Stack>
                  ),
                },
                {
                  id: 'documents',
                  label: 'Documents',
                  content: (
                    <CommitmentDocumentsPanel commitment={commitment} />
                  ),
                },
                {
                  id: 'history',
                  label: 'Versions',
                  content: (
                    <VersionHistoryTable
                      versions={historyQuery.data ?? []}
                      currentId={commitment.id}
                    />
                  ),
                },
              ]}
            />
          ) : undefined
        }
        timeline={
          commitment ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              loading={historyQuery.isLoading}
              error={historyQuery.error}
              onRetry={() => void historyQuery.refetch()}
              title="Lifecycle timeline"
            />
          ) : undefined
        }
      />

      {selectedProjectId && commitment ? (
        <>
          <AmendCommitmentDialog
            open={amendOpen}
            onClose={() => setAmendOpen(false)}
            projectId={selectedProjectId}
            commitment={commitment}
          />
          <CancelCommitmentDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            projectId={selectedProjectId}
            commitment={commitment}
          />
          <RecordReceiptDialog
            open={receiptOpen}
            onClose={() => setReceiptOpen(false)}
            projectId={selectedProjectId}
            commitment={commitment}
            onRecorded={() => {
              void detailQuery.refetch();
              void historyQuery.refetch();
            }}
          />
        </>
      ) : null}
    </>
  );
}
