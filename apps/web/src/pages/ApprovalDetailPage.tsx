import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApprovalStatus } from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import { isForbiddenError } from '@/api/errors';
import {
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  StatusStrip,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { DocumentListPanel } from '@/documents';
import { ApprovalActionDialog } from '@/approvals/ApprovalActionDialog';
import { ApprovalEntitySummary } from '@/approvals/ApprovalEntitySummary';
import { ApprovalHeader } from '@/approvals/ApprovalHeader';
import { useApprovalActions } from '@/approvals/useApprovalActions';
import { useApprovalDetail } from '@/approvals/useApprovals';
import type { ApprovalActionKind } from '@/approvals/validateAction';
import {
  useApprovalTimeline,
  WorkflowTimeline,
} from '@/workflow-timeline';

/**
 * Approval detail with approve / reject / return / cancel.
 *
 * Nest permissions (do not invent codes):
 * - `approval.view` — read
 * - `approval.act` — approve, reject, return
 * - `approval.cancel` — cancel another user’s request (requester may cancel without it)
 *
 * Self-approval and step eligibility are enforced by the backend (403).
 * Mutations never apply optimistic status changes.
 */
export function ApprovalDetailPage() {
  const { approvalId } = useParams<{ approvalId: string }>();
  const { hasPermission, access, user } = useAuth();
  const { selectedProjectId } = useProject();
  const [dialogKind, setDialogKind] = useState<ApprovalActionKind | null>(null);

  const canView = Boolean(access) && hasPermission('approval.view');
  const canAct = hasPermission('approval.act');
  const canCancelOthers = hasPermission('approval.cancel');

  const detailQuery = useApprovalDetail(
    selectedProjectId,
    approvalId,
    canView,
  );
  const timelineQuery = useApprovalTimeline({
    projectId: selectedProjectId,
    approvalId,
    enabled: canView,
  });

  const actionsApi = useApprovalActions({
    projectId: selectedProjectId ?? '',
    approvalId: approvalId ?? '',
  });

  const approval = detailQuery.data ?? null;
  const isRequester = Boolean(
    user?.id && approval?.requestedBy && user.id === approval.requestedBy,
  );
  const canCancel = canCancelOthers || isRequester;

  const actions: EntityDetailAction[] = useMemo(() => {
    const list: EntityDetailAction[] = [];
    if (canAct) {
      list.push(
        {
          id: 'approve',
          label: 'Approve',
          permission: 'approval.act',
          allowedStatuses: [ApprovalStatus.Pending],
          variant: 'contained',
          color: 'success',
          loading: actionsApi.approve.isPending,
          disabled: actionsApi.isPending,
          onClick: () => setDialogKind('approve'),
        },
        {
          id: 'reject',
          label: 'Reject',
          permission: 'approval.act',
          allowedStatuses: [ApprovalStatus.Pending],
          color: 'error',
          loading: actionsApi.reject.isPending,
          disabled: actionsApi.isPending,
          onClick: () => setDialogKind('reject'),
        },
        {
          id: 'return',
          label: 'Return',
          permission: 'approval.act',
          allowedStatuses: [ApprovalStatus.Pending],
          color: 'warning',
          loading: actionsApi.returnForCorrection.isPending,
          disabled: actionsApi.isPending,
          onClick: () => setDialogKind('return'),
        },
      );
    }
    if (canCancel) {
      list.push({
        id: 'cancel',
        label: 'Cancel',
        // Requester may cancel without approval.cancel; page already requires view.
        permission: canCancelOthers ? 'approval.cancel' : 'approval.view',
        allowedStatuses: [
          ApprovalStatus.Draft,
          ApprovalStatus.Pending,
          ApprovalStatus.Returned,
        ],
        color: 'error',
        variant: 'outlined',
        loading: actionsApi.cancel.isPending,
        disabled: actionsApi.isPending,
        onClick: () => setDialogKind('cancel'),
      });
    }
    return list;
  }, [
    canAct,
    canCancel,
    canCancelOthers,
    actionsApi.approve.isPending,
    actionsApi.reject.isPending,
    actionsApi.returnForCorrection.isPending,
    actionsApi.cancel.isPending,
    actionsApi.isPending,
  ]);

  const detailError = detailQuery.error;
  const denied = detailError != null && isForbiddenError(detailError);

  if (denied) {
    return (
      <PermissionDenied
        error={detailError}
        title="Approval unavailable"
        message="You do not have access to this approval request."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={Boolean(selectedProjectId)}
        loading={detailQuery.isLoading}
        error={detailError}
        onRetry={() => void detailQuery.refetch()}
        notFound={!detailQuery.isLoading && !detailError && !approval}
        permissionTitle="Approval unavailable"
        permissionMessage="You need the approval.view permission to open this request."
        projectMissingTitle="Project required"
        projectMissingDescription="Select the project this approval belongs to, then open it again from the inbox."
        notFoundTitle="Approval not found"
        notFoundDescription="This request may have been removed or belongs to another project."
        header={approval ? <ApprovalHeader approval={approval} /> : undefined}
        statusStrip={
          approval ? (
            <StatusStrip
              status={String(approval.status)}
              domainKey="approval"
              badges={
                approval.escalated
                  ? [{ id: 'escalated', label: 'Escalated', color: 'error' }]
                  : undefined
              }
            />
          ) : undefined
        }
        actionBar={
          approval ? (
            <EntityActionBar
              actions={actions}
              status={String(approval.status)}
              hasPermission={hasPermission}
              emptyHint="No actions for this status and your permissions. Self-approval and step eligibility are enforced by the server."
            />
          ) : undefined
        }
        summary={
          approval ? <ApprovalEntitySummary approval={approval} /> : undefined
        }
        tabs={
          approval ? (
            <EntityDetailTabs
              tabs={[
                {
                  id: 'documents',
                  label: 'Documents',
                  permission: 'document.view',
                  content: (
                    <DocumentListPanel
                      entityType={approval.entityType}
                      entityId={approval.entityId}
                      module={approval.module}
                      projectId={approval.projectId}
                      title="Linked documents"
                    />
                  ),
                },
              ]}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        timeline={
          <WorkflowTimeline
            title="Approval timeline"
            events={timelineQuery.events}
            loading={timelineQuery.isLoading}
            error={timelineQuery.error}
            onRetry={() => void timelineQuery.refetch()}
            canView={canView}
          />
        }
      />

      <ApprovalActionDialog
        open={dialogKind != null}
        kind={dialogKind}
        loading={actionsApi.isPending}
        onClose={() => setDialogKind(null)}
        onConfirm={(comment) => {
          if (!dialogKind || !selectedProjectId || !approvalId) return;
          const body = { comment };
          if (dialogKind === 'approve') {
            actionsApi.approve.mutate(body, {
              onSettled: () => setDialogKind(null),
            });
          } else if (dialogKind === 'reject') {
            actionsApi.reject.mutate(body, {
              onSettled: () => setDialogKind(null),
            });
          } else if (dialogKind === 'return') {
            actionsApi.returnForCorrection.mutate(body, {
              onSettled: () => setDialogKind(null),
            });
          } else {
            actionsApi.cancel.mutate(
              { reason: comment },
              { onSettled: () => setDialogKind(null) },
            );
          }
        }}
      />
    </>
  );
}
