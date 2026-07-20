import { useEffect, useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate } from '@/format';
import { GrnGpsPanel } from '@/grns/GrnGpsPanel';
import { GrnItemAcceptancePanel } from '@/grns/GrnItemAcceptancePanel';
import { GrnMediaGallery } from '@/grns/GrnMediaGallery';
import { GrnPoComparison } from '@/grns/GrnPoComparison';
import { GrnStatusChip } from '@/grns/GrnStatusChip';
import { grnStatusLabel } from '@/grns/labels';
import { resolveGrnCapabilities } from '@/grns/roleAccess';
import {
  useAcceptGoodsReceipt,
  useGrnDetail,
  usePostGoodsReceipt,
  usePurchaseOrderForCompare,
  useStartGrnQualityCheck,
} from '@/grns/useGrns';
import {
  defaultAcceptDrafts,
  validateAcceptPayload,
  type AcceptLineDraft,
} from '@/grns/validation';
import { resolveGrnRowActions } from '@/grns/workflowActions';
import { GoodsReceiptStatus } from '@/grns/types';

/**
 * Goods receipt detail — `/inventory/grns/:grnId` (Micro Phase 068).
 *
 * Nest: GET detail · quality-check · accept · post.
 * Permissions: `grn.create` (view) · `grn.approve` (QC / accept / post).
 */
export function GrnDetailPage() {
  const { grnId = '' } = useParams<{ grnId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveGrnCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');
  const [drafts, setDrafts] = useState<AcceptLineDraft[]>([]);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useGrnDetail(grnId || undefined, canView);
  const grn = detailQuery.data;

  const poQuery = usePurchaseOrderForCompare(
    grn?.purchaseOrderId,
    canView &&
      caps.canViewPurchaseOrder &&
      Boolean(grn?.purchaseOrderId) &&
      tab === 'po',
  );

  const startQc = useStartGrnQualityCheck();
  const accept = useAcceptGoodsReceipt();
  const post = usePostGoodsReceipt();

  useEffect(() => {
    if (!grn) return;
    setDrafts(defaultAcceptDrafts(grn.items));
  }, [grn]);

  const acceptanceEditable =
    Boolean(grn) &&
    caps.canAccept &&
    (grn!.status === GoodsReceiptStatus.Submitted ||
      grn!.status === GoodsReceiptStatus.QualityCheck);

  const summaryFields = useMemo(() => {
    if (!grn) return [];
    return [
      {
        id: 'po',
        label: 'Purchase order',
        value: grn.purchaseOrderId,
      },
      {
        id: 'vendor',
        label: 'Vendor',
        value: grn.vendorId,
      },
      {
        id: 'challan',
        label: 'Delivery challan',
        value: grn.deliveryChallanNumber ?? '—',
      },
      {
        id: 'vehicle',
        label: 'Vehicle',
        value: grn.vehicleNumber ?? '—',
      },
      {
        id: 'received',
        label: 'Received date',
        value: formatDate(grn.receivedDate),
      },
      {
        id: 'lines',
        label: 'Lines',
        value: String(grn.items.length),
      },
      {
        id: 'qc',
        label: 'Quality checked',
        value: grn.qualityCheckedAt
          ? formatDate(grn.qualityCheckedAt)
          : '—',
      },
      {
        id: 'posted',
        label: 'Posted',
        value: grn.postedAt ? formatDate(grn.postedAt) : '—',
      },
    ];
  }, [grn]);

  const allowed = grn ? resolveGrnRowActions(grn, caps) : [];

  const actions: EntityDetailAction[] = grn
    ? [
        {
          id: 'quality_check',
          label: 'Start QC',
          permission: 'grn.approve',
          allowedStatuses: ['submitted'],
          onClick: () => {
            void (async () => {
              try {
                await startQc.mutateAsync(grn.id);
                success('Moved to quality check');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: startQc.isPending,
          disabled: !allowed.includes('quality_check'),
        },
        {
          id: 'accept',
          label: 'Record acceptance',
          permission: 'grn.approve',
          allowedStatuses: ['submitted', 'quality_check'],
          color: 'success',
          onClick: () => {
            void (async () => {
              const parsed = validateAcceptPayload(drafts);
              if (!parsed.ok) {
                notifyError(parsed.message);
                setTab('overview');
                return;
              }
              try {
                await accept.mutateAsync({
                  id: grn.id,
                  input: { items: parsed.items },
                });
                success('Goods receipt acceptance recorded');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: accept.isPending,
          disabled: !allowed.includes('accept'),
        },
        {
          id: 'post',
          label: 'Post to stock',
          permission: 'grn.approve',
          allowedStatuses: ['accepted', 'partially_accepted'],
          color: 'primary',
          onClick: () => setPostConfirmOpen(true),
          loading: post.isPending,
          disabled: !allowed.includes('post'),
        },
      ]
    : [];

  const projectMismatch =
    Boolean(grn) &&
    Boolean(selectedProjectId) &&
    grn!.projectId !== selectedProjectId;

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={projectReady}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          Boolean(grnId) &&
          !detailQuery.isLoading &&
          !grn &&
          !detailQuery.error
        }
        permissionTitle="Goods receipt unavailable"
        permissionMessage="You need the grn.create permission to view goods receipts."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project in the header before opening a goods receipt."
        notFoundTitle="Goods receipt not found"
        header={
          grn ? (
            <DetailHeader
              title={grn.grnNumber}
              subtitle={grnStatusLabel(grn.status)}
              backTo="/inventory/grns"
              backLabel="Goods Receipts"
              meta={<GrnStatusChip status={grn.status} />}
            />
          ) : undefined
        }
        statusStrip={
          projectMismatch ? (
            <Typography color="warning.main" variant="body2">
              This GRN belongs to another project than the one selected in
              the header.
            </Typography>
          ) : undefined
        }
        summary={
          grn ? <SummaryCards fields={summaryFields} /> : undefined
        }
        actionBar={
          grn ? (
            <EntityActionBar
              status={grn.status}
              actions={actions}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        tabs={
          grn ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'overview',
                  label: 'Items & acceptance',
                  content: (
                    <GrnItemAcceptancePanel
                      items={grn.items}
                      drafts={drafts}
                      onChange={setDrafts}
                      editable={acceptanceEditable}
                    />
                  ),
                },
                {
                  id: 'media',
                  label: 'Media',
                  content: (
                    <GrnMediaGallery
                      photos={grn.photos}
                      challanDocument={grn.challanDocument}
                      weighbridgeDocument={grn.weighbridgeDocument}
                      canDownload={caps.canDownloadDocuments}
                    />
                  ),
                },
                {
                  id: 'gps',
                  label: 'GPS',
                  content: (
                    <GrnGpsPanel
                      latitude={grn.latitude}
                      longitude={grn.longitude}
                    />
                  ),
                },
                {
                  id: 'po',
                  label: 'PO comparison',
                  content: (
                    <GrnPoComparison
                      grnItems={grn.items}
                      purchaseOrder={poQuery.data}
                      loading={poQuery.isLoading}
                      error={poQuery.error}
                      canViewPo={caps.canViewPurchaseOrder}
                    />
                  ),
                },
              ]}
            />
          ) : undefined
        }
      />

      <ConfirmDialog
        open={postConfirmOpen}
        title="Post goods receipt to stock?"
        description="Stock increases for accepted quantity only. This cannot be undone from the GRN screen."
        confirmLabel="Post to stock"
        loading={post.isPending}
        onCancel={() => setPostConfirmOpen(false)}
        onConfirm={() => {
          if (!grn) return;
          void (async () => {
            try {
              await post.mutateAsync(grn.id);
              success(
                'Goods receipt posted; stock updated for accepted quantity',
              );
              setPostConfirmOpen(false);
              await detailQuery.refetch();
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />
    </>
  );
}
