import { useMemo, useState } from 'react';
import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
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
import { AmendWorkOrderDialog } from '@/work-orders/AmendWorkOrderDialog';
import { CancelWorkOrderDialog } from '@/work-orders/CancelWorkOrderDialog';
import { RejectAmendmentDialog } from '@/work-orders/RejectAmendmentDialog';
import {
  WorkOrderFormDrawer,
  type WorkOrderEntryMode,
} from '@/work-orders/WorkOrderFormDrawer';
import { WorkOrderStatusChip } from '@/work-orders/WorkOrderStatusChip';
import {
  amendmentStatusLabel,
  amendmentTypeLabel,
  responsibilityLabel,
  workOrderStatusLabel,
} from '@/work-orders/labels';
import { resolveWorkOrderCapabilities } from '@/work-orders/roleAccess';
import type { PublicWorkOrderAmendment } from '@/work-orders/types';
import {
  useAcceptWorkOrder,
  useApproveWorkOrder,
  useApproveWorkOrderAmendment,
  useCloseWorkOrder,
  useCompleteWorkOrder,
  useIssueWorkOrder,
  usePartiallyCompleteWorkOrder,
  useStartWorkOrder,
  useSubmitWorkOrder,
  useWorkOrderAmendments,
  useWorkOrderDetail,
} from '@/work-orders/useWorkOrders';
import {
  resolveAmendmentActions,
  resolveWorkOrderActions,
} from '@/work-orders/workflowActions';

/**
 * Work order detail — `/work-orders/:id`.
 * Workflow transitions + amendment approve/reject.
 */
export function WorkOrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveWorkOrderCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [tab, setTab] = useState('overview');
  const [drawerMode, setDrawerMode] = useState<WorkOrderEntryMode>('edit');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectTarget, setRejectTarget] =
    useState<PublicWorkOrderAmendment | null>(null);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useWorkOrderDetail(id || undefined, canView && projectReady);
  const wo = detailQuery.data;

  const amendmentsQuery = useWorkOrderAmendments(
    id || undefined,
    canView && projectReady && Boolean(id),
  );
  const amendments = amendmentsQuery.data ?? [];

  const submit = useSubmitWorkOrder();
  const approve = useApproveWorkOrder();
  const issue = useIssueWorkOrder();
  const accept = useAcceptWorkOrder();
  const start = useStartWorkOrder();
  const partiallyComplete = usePartiallyCompleteWorkOrder();
  const complete = useCompleteWorkOrder();
  const close = useCloseWorkOrder();
  const approveAmendment = useApproveWorkOrderAmendment();

  const summaryFields = useMemo(() => {
    if (!wo) return [];
    return [
      {
        id: 'value',
        label: 'Contract value',
        value: formatInr(wo.contractValue),
      },
      {
        id: 'revision',
        label: 'Active revision',
        value: `r${wo.activeRevision}`,
      },
      {
        id: 'lines',
        label: 'BOQ lines',
        value: String(wo.boqScopeLines.length),
      },
      {
        id: 'start',
        label: 'Start',
        value: formatDate(wo.startDate),
      },
      {
        id: 'end',
        label: 'End',
        value: formatDate(wo.endDate),
      },
      {
        id: 'material',
        label: 'Material',
        value: responsibilityLabel(wo.materialResponsibility),
      },
      {
        id: 'labour',
        label: 'Labour',
        value: responsibilityLabel(wo.labourResponsibility),
      },
    ];
  }, [wo]);

  const allowed = wo
    ? resolveWorkOrderActions(wo, caps, amendments)
    : [];

  const busy =
    submit.isPending ||
    approve.isPending ||
    issue.isPending ||
    accept.isPending ||
    start.isPending ||
    partiallyComplete.isPending ||
    complete.isPending ||
    close.isPending ||
    approveAmendment.isPending;

  const runTransition = async (
    label: string,
    fn: () => Promise<unknown>,
  ) => {
    try {
      await fn();
      success(label);
      await detailQuery.refetch();
      await amendmentsQuery.refetch();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const actions: EntityDetailAction[] = wo
    ? [
        {
          id: 'edit',
          label: 'Edit draft',
          permission: 'work_order.create',
          allowedStatuses: ['draft'],
          onClick: () => {
            setDrawerMode('edit');
            setDrawerOpen(true);
          },
          disabled: !allowed.includes('edit') || busy,
        },
        {
          id: 'submit',
          label: 'Submit',
          permission: 'work_order.create',
          allowedStatuses: ['draft'],
          onClick: () =>
            void runTransition('Work order submitted', () =>
              submit.mutateAsync(wo.id),
            ),
          loading: submit.isPending,
          disabled: !allowed.includes('submit') || busy,
        },
        {
          id: 'approve',
          label: 'Approve',
          permission: 'work_order.approve',
          allowedStatuses: ['pending_approval'],
          color: 'success',
          variant: 'contained',
          onClick: () =>
            void runTransition('Work order approved (r1 frozen)', () =>
              approve.mutateAsync(wo.id),
            ),
          loading: approve.isPending,
          disabled: !allowed.includes('approve') || busy,
        },
        {
          id: 'issue',
          label: 'Issue',
          permission: 'work_order.issue',
          allowedStatuses: ['approved'],
          onClick: () =>
            void runTransition('Work order issued', () =>
              issue.mutateAsync(wo.id),
            ),
          loading: issue.isPending,
          disabled: !allowed.includes('issue') || busy,
        },
        {
          id: 'accept',
          label: 'Accept',
          permission: 'work_order.create',
          allowedStatuses: ['issued'],
          onClick: () =>
            void runTransition('Work order accepted', () =>
              accept.mutateAsync(wo.id),
            ),
          loading: accept.isPending,
          disabled: !allowed.includes('accept') || busy,
        },
        {
          id: 'start',
          label: 'Start work',
          permission: 'work_order.create',
          allowedStatuses: ['accepted'],
          onClick: () =>
            void runTransition('Work started', () => start.mutateAsync(wo.id)),
          loading: start.isPending,
          disabled: !allowed.includes('start') || busy,
        },
        {
          id: 'partially_complete',
          label: 'Partially complete',
          permission: 'work_order.create',
          allowedStatuses: ['in_progress'],
          onClick: () =>
            void runTransition('Marked partially complete', () =>
              partiallyComplete.mutateAsync(wo.id),
            ),
          loading: partiallyComplete.isPending,
          disabled: !allowed.includes('partially_complete') || busy,
        },
        {
          id: 'complete',
          label: 'Complete',
          permission: 'work_order.create',
          allowedStatuses: ['in_progress', 'partially_completed'],
          color: 'success',
          onClick: () =>
            void runTransition('Work order completed', () =>
              complete.mutateAsync(wo.id),
            ),
          loading: complete.isPending,
          disabled: !allowed.includes('complete') || busy,
        },
        {
          id: 'close',
          label: 'Close',
          permission: 'work_order.close',
          allowedStatuses: ['completed'],
          onClick: () =>
            void runTransition('Work order closed', () =>
              close.mutateAsync(wo.id),
            ),
          loading: close.isPending,
          disabled: !allowed.includes('close') || busy,
        },
        {
          id: 'amend',
          label: 'Amend',
          permission: 'work_order.create',
          allowedStatuses: [
            'approved',
            'issued',
            'accepted',
            'in_progress',
            'partially_completed',
          ],
          onClick: () => setAmendOpen(true),
          disabled: !allowed.includes('amend') || busy,
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'work_order.close',
          allowedStatuses: ['draft', 'pending_approval', 'approved', 'issued'],
          color: 'error',
          variant: 'outlined',
          onClick: () => setCancelOpen(true),
          disabled: !allowed.includes('cancel') || busy,
        },
      ]
    : [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Work order unavailable"
        message="You need the work_order.view permission."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Work order denied"
        message="The server denied access to this work order (403)."
      />
    );
  }

  if (wo && selectedProjectId && wo.projectId !== selectedProjectId) {
    return (
      <PermissionDenied
        title="Wrong project"
        message="This work order belongs to another project. Switch the active project in the header."
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
        onRetry={() => void detailQuery.refetch()}
        notFound={!detailQuery.isLoading && !detailQuery.error && !wo}
        permissionTitle="Work order unavailable"
        permissionMessage="You need work_order.view to open work orders."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project before opening work orders."
        notFoundTitle="Work order not found"
        notFoundDescription="This work order may belong to another project or the id is invalid."
        header={
          wo ? (
            <DetailHeader
              title={wo.workOrderNumber}
              code={`r${wo.activeRevision}`}
              subtitle={workOrderStatusLabel(wo.status)}
              backTo="/work-orders"
              backLabel="Work orders"
              meta={<WorkOrderStatusChip status={wo.status} />}
            />
          ) : undefined
        }
        actionBar={
          wo ? (
            <EntityActionBar
              actions={actions}
              status={wo.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={wo ? <SummaryCards fields={summaryFields} /> : undefined}
        tabs={
          wo ? (
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
                      <Typography variant="body2">
                        Locations:{' '}
                        {wo.locations.length > 0
                          ? wo.locations.join(', ')
                          : '—'}
                      </Typography>
                      {wo.terms ? (
                        <Typography variant="body2">{wo.terms}</Typography>
                      ) : null}
                      {wo.notes ? (
                        <Typography variant="body2" color="text.secondary">
                          Notes: {wo.notes}
                        </Typography>
                      ) : null}
                    </Stack>
                  ),
                },
                {
                  id: 'scope',
                  label: 'BOQ scope',
                  content: (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Description</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Rate</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wo.boqScopeLines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography variant="body2" color="text.secondary">
                                No BOQ lines.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          wo.boqScopeLines.map((line, idx) => (
                            <TableRow key={line.id ?? `${idx}-${line.description}`}>
                              <TableCell>{line.description}</TableCell>
                              <TableCell>{line.unit}</TableCell>
                              <TableCell align="right">{line.quantity}</TableCell>
                              <TableCell align="right">
                                {formatInr(line.rate)}
                              </TableCell>
                              <TableCell align="right">
                                {formatInr(line.value)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  ),
                },
                {
                  id: 'revisions',
                  label: 'Revisions',
                  content: (
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Append-only. Approved commercial snapshots are never
                        overwritten.
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Rev</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell>Terms</TableCell>
                            <TableCell>Frozen</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {wo.revisions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  No frozen revisions yet (approve WO to freeze
                                  r1).
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            wo.revisions.map((rev) => (
                              <TableRow key={rev.revision}>
                                <TableCell>r{rev.revision}</TableCell>
                                <TableCell align="right">
                                  {formatInr(rev.contractValue)}
                                </TableCell>
                                <TableCell>{rev.terms ?? '—'}</TableCell>
                                <TableCell>
                                  {rev.frozenAt
                                    ? formatDate(rev.frozenAt)
                                    : '—'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </Stack>
                  ),
                },
                {
                  id: 'amendments',
                  label: 'Amendments',
                  content: (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Number</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Target</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Proposed value</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {amendmentsQuery.isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Loading…
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : amendments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                No amendments.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          amendments.map((a) => {
                            const amdActions = resolveAmendmentActions(
                              a,
                              caps,
                            );
                            return (
                              <TableRow key={a.id}>
                                <TableCell>{a.amendmentNumber}</TableCell>
                                <TableCell>
                                  {amendmentTypeLabel(a.type)}
                                </TableCell>
                                <TableCell>r{a.targetRevision}</TableCell>
                                <TableCell>
                                  {amendmentStatusLabel(a.status)}
                                </TableCell>
                                <TableCell>
                                  {formatInr(a.proposed.contractValue)}
                                </TableCell>
                                <TableCell align="right">
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      sx={{ justifyContent: 'flex-end' }}
                                    >
                                    {amdActions.includes('approve') ? (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="success"
                                        disabled={busy}
                                        onClick={() =>
                                          void runTransition(
                                            'Amendment approved — new revision frozen',
                                            () =>
                                              approveAmendment.mutateAsync(
                                                a.id,
                                              ),
                                          )
                                        }
                                      >
                                        Approve
                                      </Button>
                                    ) : null}
                                    {amdActions.includes('reject') ? (
                                      <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        disabled={busy}
                                        onClick={() => setRejectTarget(a)}
                                      >
                                        Reject
                                      </Button>
                                    ) : null}
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  ),
                },
              ]}
            />
          ) : undefined
        }
      />

      {wo && selectedProjectId ? (
        <>
          <WorkOrderFormDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            mode={drawerMode}
            projectId={selectedProjectId}
            workOrder={wo}
            canCreate={caps.canCreate}
          />
          <AmendWorkOrderDialog
            open={amendOpen}
            onClose={() => setAmendOpen(false)}
            workOrder={wo}
            onCreated={() => void amendmentsQuery.refetch()}
          />
          <CancelWorkOrderDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            workOrder={wo}
          />
          <RejectAmendmentDialog
            open={Boolean(rejectTarget)}
            onClose={() => setRejectTarget(null)}
            amendment={rejectTarget}
          />
        </>
      ) : null}
    </>
  );
}
