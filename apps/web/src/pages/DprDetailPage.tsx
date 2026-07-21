import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate, formatInr } from '@/format';
import {
  DprIssuesSection,
  DprLabourSection,
  DprMaterialsSection,
  DprMediaGallery,
  DprPlanSection,
  DprStatusChip,
  DprWorkSection,
  ReopenDprDialog,
  ReviewDprDialog,
  DprStatus,
  dprListPath,
  dprStatusLabel,
  dprWeatherLabel,
  resolveDprCapabilities,
  useApproveDpr,
  useDprDetail,
  useLockDpr,
  useRegenerateDprPdf,
  useReopenDpr,
  useReviewDpr,
  useVerifyDpr,
} from '@/dpr';

/**
 * DPR detail — `/project-control/dpr/:id`.
 * Nest: GET detail · verify · approve · lock · review · reopen · regenerate-pdf
 * (`dpr.view` / `dpr.review`).
 */
export function DprDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveDprCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useDprDetail(id || undefined, canView);
  const dpr = detailQuery.data;
  const verify = useVerifyDpr();
  const approve = useApproveDpr();
  const lock = useLockDpr();
  const review = useReviewDpr();
  const reopen = useReopenDpr();
  const regeneratePdf = useRegenerateDprPdf();

  const actions: EntityDetailAction[] = useMemo(() => {
    if (!dpr) return [];
    return [
      {
        id: 'verify',
        label: 'Verify',
        permission: 'dpr.review',
        allowedStatuses: [DprStatus.Submitted],
        variant: 'contained',
        onClick: () => {
          void (async () => {
            try {
              await verify.mutateAsync({ id: dpr.id });
              success('DPR verified');
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        },
        loading: verify.isPending,
      },
      {
        id: 'approve',
        label: 'Approve',
        permission: 'dpr.review',
        allowedStatuses: [DprStatus.Submitted, DprStatus.Verified],
        variant: 'contained',
        onClick: () => {
          void (async () => {
            try {
              await approve.mutateAsync({ id: dpr.id });
              success('DPR approved — material consumption posted');
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        },
        loading: approve.isPending,
      },
      {
        id: 'lock',
        label: 'Lock',
        permission: 'dpr.review',
        allowedStatuses: [DprStatus.Approved, DprStatus.Reviewed],
        onClick: () => {
          void (async () => {
            try {
              await lock.mutateAsync(dpr.id);
              success('DPR locked');
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        },
        loading: lock.isPending,
      },
      {
        id: 'review',
        label: 'Review (legacy)',
        permission: 'dpr.review',
        allowedStatuses: [DprStatus.Submitted],
        onClick: () => setReviewOpen(true),
        loading: review.isPending,
      },
      {
        id: 'reopen',
        label: 'Reopen',
        permission: 'dpr.review',
        allowedStatuses: [
          DprStatus.Submitted,
          DprStatus.Verified,
          DprStatus.Approved,
          DprStatus.Reviewed,
          DprStatus.Locked,
        ],
        onClick: () => setReopenOpen(true),
        loading: reopen.isPending,
      },
      {
        id: 'regenerate_pdf',
        label: 'Regenerate PDF',
        permission: 'dpr.review',
        allowedStatuses: [
          DprStatus.Submitted,
          DprStatus.Verified,
          DprStatus.Approved,
          DprStatus.Reviewed,
          DprStatus.Locked,
        ],
        onClick: () => {
          void (async () => {
            try {
              await regeneratePdf.mutateAsync(dpr.id);
              success('PDF regeneration queued');
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        },
        loading: regeneratePdf.isPending,
      },
    ];
  }, [
    approve,
    dpr,
    lock,
    notifyError,
    regeneratePdf,
    reopen.isPending,
    review.isPending,
    success,
    verify,
  ]);

  const summaryFields = useMemo(() => {
    if (!dpr) return [];
    return [
      { id: 'date', label: 'Report date', value: formatDate(dpr.reportDate) },
      {
        id: 'site',
        label: 'Site',
        value: dpr.siteId ? String(dpr.siteId) : '—',
      },
      {
        id: 'shift',
        label: 'Shift',
        value: dpr.shift ? String(dpr.shift) : '—',
      },
      {
        id: 'weather',
        label: 'Weather',
        value: dprWeatherLabel(String(dpr.weather)),
      },
      { id: 'labour', label: 'Labour', value: String(dpr.labourCount) },
      {
        id: 'cash',
        label: 'Site cash',
        value: formatInr(dpr.siteCashBalance),
      },
      {
        id: 'submitted',
        label: 'Submitted',
        value: dpr.submittedAt ? formatDate(dpr.submittedAt) : '—',
      },
      {
        id: 'approved',
        label: 'Approved',
        value: dpr.approvedAt
          ? formatDate(dpr.approvedAt)
          : dpr.reviewedAt
            ? formatDate(dpr.reviewedAt)
            : '—',
      },
    ];
  }, [dpr]);

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          Boolean(id) &&
          !detailQuery.isLoading &&
          !dpr &&
          !detailQuery.error
        }
        permissionTitle="Daily progress unavailable"
        permissionMessage="You need the dpr.view permission to open a daily progress report."
        notFoundTitle="Daily progress report not found"
        notFoundDescription="This DPR may have been removed or belongs to another project."
        header={
          dpr ? (
            <DetailHeader
              title="Daily progress report"
              code={dpr.dprNumber}
              subtitle={formatDate(dpr.reportDate)}
              backTo={dprListPath()}
              backLabel="Back to list"
              meta={<DprStatusChip status={dpr.status} />}
            />
          ) : undefined
        }
        actionBar={
          dpr ? (
            <EntityActionBar
              actions={actions}
              status={dpr.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={dpr ? <SummaryCards fields={summaryFields} /> : undefined}
      >
        {dpr ? (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Status: {dprStatusLabel(dpr.status)}
              {dpr.verifyNotes ? ` · Verify notes: ${dpr.verifyNotes}` : ''}
              {dpr.approveNotes ? ` · Approve notes: ${dpr.approveNotes}` : ''}
              {dpr.reviewNotes ? ` · Review notes: ${dpr.reviewNotes}` : ''}
              {dpr.reopenReason ? ` · Reopen reason: ${dpr.reopenReason}` : ''}
            </Typography>

            {dpr.weatherNotes ? (
              <Alert severity="info">Weather notes: {dpr.weatherNotes}</Alert>
            ) : null}

            <DprLabourSection dpr={dpr} />
            <DprWorkSection dpr={dpr} />
            <DprMaterialsSection dpr={dpr} />
            <DprPlanSection dpr={dpr} />
            <DprIssuesSection dpr={dpr} />

            <Stack spacing={1}>
              <Typography variant="subtitle2">Site media</Typography>
              <DprMediaGallery
                photoDocumentIds={dpr.photoDocumentIds}
                videoDocumentIds={dpr.videoDocumentIds}
                canDownload={caps.canView}
              />
            </Stack>
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <ReviewDprDialog
        open={reviewOpen}
        loading={review.isPending}
        onCancel={() => setReviewOpen(false)}
        onConfirm={(reviewNotes) => {
          if (!dpr) return;
          void (async () => {
            try {
              await review.mutateAsync({
                id: dpr.id,
                input: { reviewNotes: reviewNotes.trim() || null },
              });
              success('DPR reviewed');
              setReviewOpen(false);
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />

      <ReopenDprDialog
        open={reopenOpen}
        loading={reopen.isPending}
        onCancel={() => setReopenOpen(false)}
        onConfirm={(reason) => {
          if (!dpr) return;
          void (async () => {
            try {
              await reopen.mutateAsync({
                id: dpr.id,
                input: { reason },
              });
              success('DPR reopened');
              setReopenOpen(false);
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />
    </>
  );
}
