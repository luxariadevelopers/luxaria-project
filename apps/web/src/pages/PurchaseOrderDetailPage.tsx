import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
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
import { ApprovePurchaseOrderDialog } from '@/purchase-orders/ApprovePurchaseOrderDialog';
import { buildPurchaseOrderTimeline } from '@/purchase-orders/buildPurchaseOrderTimeline';
import { CancelPurchaseOrderDialog } from '@/purchase-orders/CancelPurchaseOrderDialog';
import { assertPurchaseOrderNotSilentlyEditable } from '@/purchase-orders/immutableState';
import { purchaseOrderStatusLabel } from '@/purchase-orders/labels';
import { POStatusChip } from '@/purchase-orders/POStatusChip';
import { PurchaseOrderDocumentsPanel } from '@/purchase-orders/PurchaseOrderDocumentsPanel';
import { ReceiptProgressPanel } from '@/purchase-orders/ReceiptProgressPanel';
import { RejectPurchaseOrderDialog } from '@/purchase-orders/RejectPurchaseOrderDialog';
import { computeReceivedAmount } from '@/purchase-orders/receivedValue';
import { resolvePurchaseOrderCapabilities } from '@/purchase-orders/roleAccess';
import { RevisionHistoryTable } from '@/purchase-orders/RevisionHistoryTable';
import { RevisePurchaseOrderDialog } from '@/purchase-orders/RevisePurchaseOrderDialog';
import { PURCHASE_ORDER_ROUTES } from '@/purchase-orders/routes';
import {
  useClosePurchaseOrder,
  usePurchaseOrderDetail,
  usePurchaseOrderRevisions,
  useSubmitPurchaseOrder,
} from '@/purchase-orders/usePurchaseOrders';
import { VersionComparisonPanel } from '@/purchase-orders/VersionComparisonPanel';
import { resolvePurchaseOrderDetailActions } from '@/purchase-orders/workflowActions';
import { DocumentActionMenu } from '@/print-pdf';
import { purchaseOrderPdfSource } from '@/print-pdf/sources';
import { WorkflowTimeline } from '@/workflow-timeline';

/**
 * Purchase order detail & revision (Micro Phase 067).
 * Route: `/procurement/purchase-orders/:purchaseOrderId`
 *
 * Nest: GET detail/balance · submit · approve/reject · revise · cancel/close · PDF
 * Permissions: purchase.view / purchase.order / purchase.approve
 * (prompt aliases purchase_order.* are not in the Nest catalog)
 */
export function PurchaseOrderDetailPage() {
  const { purchaseOrderId = '' } = useParams<{ purchaseOrderId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolvePurchaseOrderCapabilities(hasPermission);
  const { selectedProjectId, projects } = useProject();
  const { success, error: notifyError } = useNotify();

  const [tab, setTab] = useState('overview');
  const [reviseOpen, setReviseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = usePurchaseOrderDetail(
    purchaseOrderId || null,
    canView && projectReady,
  );
  const po = detailQuery.data;

  const revisionsQuery = usePurchaseOrderRevisions(
    po,
    canView && projectReady && Boolean(po),
  );

  const submit = useSubmitPurchaseOrder();
  const close = useClosePurchaseOrder();

  const projectLabel = useMemo(() => {
    if (!po) return '—';
    const p = projects.find((x) => x.id === po.projectId);
    if (!p) return po.projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [po, projects]);

  const summaryFields = useMemo(() => {
    if (!po) return [];
    const received = computeReceivedAmount(po.total, po.balanceAmount);
    return [
      {
        id: 'total',
        label: 'PO total',
        value: formatInr(po.total),
      },
      {
        id: 'received',
        label: 'Received value',
        value: formatInr(received),
      },
      {
        id: 'balance',
        label: 'Open balance',
        value: formatInr(po.balanceAmount),
      },
      {
        id: 'revision',
        label: 'Revision',
        value: `r${po.revisionNumber}`,
      },
      {
        id: 'orderDate',
        label: 'Order date',
        value: formatDate(po.orderDate),
      },
      {
        id: 'delivery',
        label: 'Expected delivery',
        value: formatDate(po.expectedDeliveryDate),
      },
      {
        id: 'vendor',
        label: 'Vendor id',
        value: po.vendorId,
      },
      {
        id: 'project',
        label: 'Project',
        value: projectLabel,
      },
    ];
  }, [po, projectLabel]);

  const allowed = po
    ? resolvePurchaseOrderDetailActions(po, caps)
    : [];

  const silentEditGate = po
    ? assertPurchaseOrderNotSilentlyEditable(po.status)
    : null;

  const actions: EntityDetailAction[] = po
    ? [
        {
          id: 'submit',
          label: 'Submit for approval',
          permission: 'purchase.order',
          allowedStatuses: ['draft', 'rejected'],
          onClick: () => {
            void (async () => {
              try {
                await submit.mutateAsync(po.id);
                success('Purchase order submitted for approval');
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
          label: 'Approve / issue',
          permission: 'purchase.approve',
          allowedStatuses: ['pending_approval'],
          color: 'success',
          onClick: () => setApproveOpen(true),
          disabled: !allowed.includes('approve'),
        },
        {
          id: 'reject',
          label: 'Reject',
          permission: 'purchase.approve',
          allowedStatuses: ['pending_approval'],
          color: 'error',
          variant: 'outlined',
          onClick: () => setRejectOpen(true),
          disabled: !allowed.includes('reject'),
        },
        {
          id: 'revise',
          label: 'Revise',
          permission: 'purchase.order',
          allowedStatuses: ['issued'],
          onClick: () => setReviseOpen(true),
          disabled: !allowed.includes('revise'),
        },
        {
          id: 'close',
          label: 'Close',
          permission: 'purchase.order',
          allowedStatuses: [
            'issued',
            'partially_received',
            'fully_received',
          ],
          onClick: () => {
            void (async () => {
              try {
                await close.mutateAsync(po.id);
                success('Purchase order closed');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: close.isPending,
          disabled: !allowed.includes('close'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'purchase.order',
          allowedStatuses: [
            'draft',
            'pending_approval',
            'issued',
            'rejected',
            'partially_received',
          ],
          color: 'error',
          variant: 'outlined',
          onClick: () => setCancelOpen(true),
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () =>
      po
        ? buildPurchaseOrderTimeline(po, revisionsQuery.data ?? [])
        : [],
    [po, revisionsQuery.data],
  );

  const pdfSource = po
    ? purchaseOrderPdfSource({
        id: po.id,
        pdfPath: po.pdfPath,
        status: po.status,
      })
    : null;

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Purchase order unavailable"
        message="You need the purchase.view permission to open this purchase order."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Purchase order unavailable"
        message="The server denied access to this purchase order (403)."
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
          !detailQuery.isLoading && !detailQuery.error && !po
        }
        permissionTitle="Purchase order unavailable"
        permissionMessage="You need the purchase.view permission to open this purchase order."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project in the header before opening a purchase order."
        notFoundTitle="Purchase order not found"
        notFoundDescription="This purchase order may belong to another project, or the id is invalid."
        header={
          po ? (
            <DetailHeader
              title={po.purchaseOrderNumber}
              code={`r${po.revisionNumber}`}
              subtitle={purchaseOrderStatusLabel(po.status)}
              backTo={PURCHASE_ORDER_ROUTES.list}
              backLabel="Purchase orders"
              meta={
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <POStatusChip status={po.status} />
                  {pdfSource ? (
                    <DocumentActionMenu
                      source={pdfSource}
                      canViewEntity={caps.canView}
                    />
                  ) : null}
                </Stack>
              }
            />
          ) : undefined
        }
        actionBar={
          po ? (
            <EntityActionBar
              actions={actions}
              status={po.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={
          po ? <SummaryCards fields={summaryFields} /> : undefined
        }
        tabs={
          po ? (
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
                      {silentEditGate && !silentEditGate.ok ? (
                        <Alert severity="warning" variant="outlined">
                          {silentEditGate.message}
                        </Alert>
                      ) : null}
                      <Typography variant="body2" color="text.secondary">
                        Payment terms:{' '}
                        {po.paymentTerms?.trim() || '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Terms: {po.terms?.trim() || '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        PR id: {po.purchaseRequestId} · Quotation id:{' '}
                        {po.selectedQuotationId}
                        {po.revisedFromId
                          ? ` · Revised from ${po.revisedFromId}`
                          : ''}
                      </Typography>
                      <Typography variant="body2">
                        Billing: {[
                          po.billingAddress.line1,
                          po.billingAddress.city,
                          po.billingAddress.state,
                          po.billingAddress.pincode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Typography>
                      <Typography variant="body2">
                        Delivery: {[
                          po.deliveryAddress.line1,
                          po.deliveryAddress.city,
                          po.deliveryAddress.state,
                          po.deliveryAddress.pincode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Typography>
                    </Stack>
                  ),
                },
                {
                  id: 'receipts',
                  label: 'Receipts',
                  content: <ReceiptProgressPanel po={po} />,
                },
                {
                  id: 'versions',
                  label: 'Versions',
                  content: (
                    <Stack spacing={2}>
                      <VersionComparisonPanel
                        current={po}
                        chain={revisionsQuery.data ?? []}
                      />
                      <RevisionHistoryTable
                        versions={revisionsQuery.data ?? []}
                        currentId={po.id}
                      />
                    </Stack>
                  ),
                },
                {
                  id: 'documents',
                  label: 'Documents',
                  permission: 'document.view',
                  content: (
                    <PurchaseOrderDocumentsPanel
                      po={po}
                      canView={caps.canView}
                    />
                  ),
                },
              ]}
            />
          ) : undefined
        }
        timeline={
          po ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              loading={revisionsQuery.isLoading}
              error={revisionsQuery.error}
              onRetry={() => void revisionsQuery.refetch()}
              title="Lifecycle timeline"
            />
          ) : undefined
        }
      />

      {po ? (
        <>
          <RevisePurchaseOrderDialog
            open={reviseOpen}
            onClose={() => setReviseOpen(false)}
            po={po}
          />
          <CancelPurchaseOrderDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            po={po}
            onCancelled={() => {
              void detailQuery.refetch();
            }}
          />
          <ApprovePurchaseOrderDialog
            open={approveOpen}
            onClose={() => setApproveOpen(false)}
            po={po}
            onDone={() => {
              void detailQuery.refetch();
              void revisionsQuery.refetch();
            }}
          />
          <RejectPurchaseOrderDialog
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            po={po}
            onDone={() => {
              void detailQuery.refetch();
            }}
          />
        </>
      ) : null}
    </>
  );
}
