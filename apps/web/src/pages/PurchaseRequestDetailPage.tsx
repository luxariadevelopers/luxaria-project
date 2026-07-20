import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
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
import { quotationComparisonPath } from '@/quotation-comparisons/paths';
import { ApprovePurchaseRequestDialog } from '@/purchase-requests/ApprovePurchaseRequestDialog';
import { buildPurchaseRequestTimeline } from '@/purchase-requests/buildRequestTimeline';
import {
  purchaseRequestPriorityLabel,
} from '@/purchase-requests/labels';
import { NotesActionDialog } from '@/purchase-requests/NotesActionDialog';
import { PurchaseRequestDocumentsPanel } from '@/purchase-requests/PurchaseRequestDocumentsPanel';
import { PurchaseRequestStatusChip } from '@/purchase-requests/PurchaseRequestStatusChip';
import { RequestedVsApprovedGrid } from '@/purchase-requests/RequestedVsApprovedGrid';
import { resolvePurchaseRequestCapabilities } from '@/purchase-requests/roleAccess';
import {
  useApprovePurchaseRequest,
  useClosePurchaseRequest,
  usePurchaseRequestDetail,
  useRejectPurchaseRequest,
  useReturnPurchaseRequest,
  useReviewPurchaseRequest,
} from '@/purchase-requests/usePurchaseRequests';
import { resolvePurchaseRequestActions } from '@/purchase-requests/workflowActions';
import { WorkflowTimeline } from '@/workflow-timeline';

type DialogMode = 'review' | 'approve' | 'reject' | 'return' | null;

/**
 * Purchase request detail + approval — `/procurement/purchase-requests/:requestId`
 * (Micro Phase 062).
 *
 * Nest: GET detail · review · approve (partial) · reject · return · close
 * Permissions: `purchase.view` / `purchase.approve` / `purchase.order`
 */
export function PurchaseRequestDetailPage() {
  const { requestId = '' } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolvePurchaseRequestCapabilities(hasPermission);
  const { selectedProjectId, projects } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('lines');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = usePurchaseRequestDetail(requestId || null, canView);
  const row = detailQuery.data;

  const review = useReviewPurchaseRequest();
  const approve = useApprovePurchaseRequest();
  const reject = useRejectPurchaseRequest();
  const returnReq = useReturnPurchaseRequest();
  const close = useClosePurchaseRequest();

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
        id: 'required',
        label: 'Required by',
        value: formatDate(row.requiredByDate),
      },
      {
        id: 'priority',
        label: 'Priority',
        value: purchaseRequestPriorityLabel(row.priority),
      },
      {
        id: 'estimated',
        label: 'Estimated total',
        value: formatInr(row.estimatedTotal),
      },
      {
        id: 'approvedTotal',
        label: 'Approved total',
        value:
          row.approvedTotal != null ? formatInr(row.approvedTotal) : '—',
      },
      {
        id: 'project',
        label: 'Project',
        value: projectLabel,
      },
      {
        id: 'lines',
        label: 'Lines',
        value: String(row.items.length),
      },
    ];
  }, [row, projectLabel]);

  const allowed = row ? resolvePurchaseRequestActions(row, caps) : [];
  const busy =
    review.isPending ||
    approve.isPending ||
    reject.isPending ||
    returnReq.isPending ||
    close.isPending;

  const actions: EntityDetailAction[] = row
    ? [
        {
          id: 'review',
          label: 'Mark reviewed',
          permission: 'purchase.approve',
          allowedStatuses: ['submitted'],
          color: 'info',
          onClick: () => setDialogMode('review'),
          disabled: !allowed.includes('review') || busy,
        },
        {
          id: 'approve',
          label: 'Approve',
          permission: 'purchase.approve',
          allowedStatuses: ['reviewed'],
          color: 'success',
          variant: 'contained',
          onClick: () => setDialogMode('approve'),
          disabled: !allowed.includes('approve') || busy,
        },
        {
          id: 'return',
          label: 'Return',
          permission: 'purchase.approve',
          allowedStatuses: ['submitted', 'reviewed'],
          color: 'warning',
          onClick: () => setDialogMode('return'),
          disabled: !allowed.includes('return') || busy,
        },
        {
          id: 'reject',
          label: 'Reject',
          permission: 'purchase.approve',
          allowedStatuses: ['submitted', 'reviewed'],
          color: 'error',
          onClick: () => setDialogMode('reject'),
          disabled: !allowed.includes('reject') || busy,
        },
        {
          id: 'close',
          label: 'Close',
          permission: 'purchase.order',
          allowedStatuses: ['approved', 'sourcing'],
          variant: 'outlined',
          onClick: () => {
            void (async () => {
              try {
                await close.mutateAsync(row.id);
                success('Purchase request closed');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: close.isPending,
          disabled: !allowed.includes('close') || busy,
        },
        {
          id: 'compare',
          label: 'Compare quotations',
          permission: 'quotation.compare',
          allowedStatuses: ['approved', 'sourcing', 'closed'],
          variant: 'outlined',
          onClick: () => navigate(quotationComparisonPath(row.id)),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () => (row ? buildPurchaseRequestTimeline(row) : []),
    [row],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Purchase request unavailable"
        message="You need the purchase.view permission to open this request."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Purchase request denied"
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
        permissionTitle="Purchase request unavailable"
        permissionMessage="You need the purchase.view permission to open this request."
        notFoundTitle="Request not found"
        notFoundDescription="This request id is invalid or was removed."
        header={
          row ? (
            <DetailHeader
              title="Purchase request"
              code={row.requestNumber}
              subtitle={`Required by ${formatDate(row.requiredByDate)}`}
              backTo="/procurement/purchase-requests"
              backLabel="Purchase requests"
              meta={
                <PurchaseRequestStatusChip
                  status={row.status}
                  partiallyApproved={row.isPartiallyApproved}
                />
              }
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
        tabs={
          row ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'lines',
                  label: 'Line items',
                  content: (
                    <Stack
                      spacing={2}
                      data-testid="purchase-request-detail-body"
                    >
                      {row.warnings.length > 0 ? (
                        <Alert severity="warning" variant="outlined">
                          {row.warnings.join(' · ')}
                        </Alert>
                      ) : null}
                      {row.rejectionReason ? (
                        <Alert severity="error" variant="outlined">
                          Rejected: {row.rejectionReason}
                        </Alert>
                      ) : null}
                      {row.reviewNotes ? (
                        <Alert severity="info" variant="outlined">
                          Review notes: {row.reviewNotes}
                        </Alert>
                      ) : null}
                      {row.approvalNotes ? (
                        <Alert severity="success" variant="outlined">
                          Approval notes: {row.approvalNotes}
                        </Alert>
                      ) : null}
                      <Typography variant="body2" color="text.secondary">
                        {row.justification}
                      </Typography>
                      <RequestedVsApprovedGrid items={row.items} />
                    </Stack>
                  ),
                },
                {
                  id: 'documents',
                  label: 'Documents',
                  permission: 'document.view',
                  content: (
                    <PurchaseRequestDocumentsPanel
                      requestId={row.id}
                      projectId={row.projectId}
                      requestNumber={row.requestNumber}
                    />
                  ),
                },
              ]}
            />
          ) : undefined
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
      />

      {row ? (
        <>
          <ApprovePurchaseRequestDialog
            open={dialogMode === 'approve'}
            items={row.items}
            loading={approve.isPending}
            onClose={() => setDialogMode(null)}
            onConfirm={async ({ items, notes }) => {
              try {
                await approve.mutateAsync({
                  id: row.id,
                  input: { items, notes },
                });
                success('Purchase request approved');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
                throw err;
              }
            }}
          />
          <NotesActionDialog
            open={dialogMode === 'review'}
            title="Mark as reviewed"
            confirmLabel="Mark reviewed"
            fieldLabel="Review notes"
            confirmColor="primary"
            loading={review.isPending}
            onClose={() => setDialogMode(null)}
            onConfirm={async (notes) => {
              try {
                await review.mutateAsync({
                  id: row.id,
                  input: { notes: notes || null },
                });
                success('Purchase request marked reviewed');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
                throw err;
              }
            }}
          />
          <NotesActionDialog
            open={dialogMode === 'reject'}
            title="Reject purchase request"
            confirmLabel="Reject"
            fieldLabel="Rejection reason"
            required
            confirmColor="error"
            loading={reject.isPending}
            onClose={() => setDialogMode(null)}
            onConfirm={async (reason) => {
              try {
                await reject.mutateAsync({
                  id: row.id,
                  input: { reason },
                });
                success('Purchase request rejected');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
                throw err;
              }
            }}
          />
          <NotesActionDialog
            open={dialogMode === 'return'}
            title="Return for correction"
            confirmLabel="Return"
            fieldLabel="Return notes"
            confirmColor="warning"
            loading={returnReq.isPending}
            onClose={() => setDialogMode(null)}
            onConfirm={async (notes) => {
              try {
                await returnReq.mutateAsync({
                  id: row.id,
                  input: { notes: notes || null },
                });
                success('Purchase request returned');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
                throw err;
              }
            }}
          />
        </>
      ) : null}
    </>
  );
}
