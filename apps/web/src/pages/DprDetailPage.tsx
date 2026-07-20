import { useMemo, useState } from 'react';
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
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatDateTime, formatInr } from '@/format';
import { DprMediaGallery } from '@/dpr/DprMediaGallery';
import {
  DprIssuesSection,
  DprLabourSection,
  DprMaterialsSection,
  DprPlanSection,
  DprWorkSection,
} from '@/dpr/DprSections';
import { ReopenDprDialog } from '@/dpr/ReopenDprDialog';
import { ReviewDprDialog } from '@/dpr/ReviewDprDialog';
import { DprStatusChip } from '@/dpr/DprStatusChip';
import { dprStatusLabel, dprWeatherLabel } from '@/dpr/labels';
import { resolveDprCapabilities } from '@/dpr/roleAccess';
import {
  useDprDetail,
  useRegenerateDprPdf,
  useReopenDpr,
  useReviewDpr,
} from '@/dpr/useDprDetail';
import { validateReviewPayload } from '@/dpr/validation';
import { resolveDprRowActions } from '@/dpr/workflowActions';

/**
 * Daily progress report detail — `/project-control/dpr/:id` (Micro Phase 083).
 *
 * Nest: GET detail · POST review · reopen · regenerate-pdf.
 * Permissions: `dpr.view` (read) · `dpr.review` (review/reopen/PDF).
 */
export function DprDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveDprCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('labour');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useDprDetail(id || undefined, canView && projectReady);
  const dpr = detailQuery.data;

  const review = useReviewDpr();
  const reopen = useReopenDpr();
  const regeneratePdf = useRegenerateDprPdf();

  const allowed = dpr ? resolveDprRowActions(dpr, caps) : [];

  const summaryFields = useMemo(() => {
    if (!dpr) return [];
    return [
      { id: 'date', label: 'Report date', value: formatDate(dpr.reportDate) },
      {
        id: 'weather',
        label: 'Weather',
        value: dprWeatherLabel(dpr.weather),
      },
      {
        id: 'labour',
        label: 'Labour count',
        value: String(dpr.labourCount),
      },
      {
        id: 'cash',
        label: 'Site cash balance',
        value: formatInr(dpr.siteCashBalance),
      },
      {
        id: 'submitted',
        label: 'Submitted',
        value: dpr.submittedAt ? formatDateTime(dpr.submittedAt) : '—',
      },
      {
        id: 'reviewed',
        label: 'Reviewed',
        value: dpr.reviewedAt ? formatDateTime(dpr.reviewedAt) : '—',
      },
      {
        id: 'pdf',
        label: 'PDF document',
        value: dpr.pdfDocumentId ?? '—',
      },
      {
        id: 'offline',
        label: 'Offline capture',
        value: dpr.offlineCapturedAt
          ? formatDateTime(dpr.offlineCapturedAt)
          : '—',
      },
    ];
  }, [dpr]);

  const actions: EntityDetailAction[] = dpr
    ? [
        {
          id: 'review',
          label: 'Review',
          permission: 'dpr.review',
          allowedStatuses: ['submitted'],
          color: 'success',
          onClick: () => setReviewOpen(true),
          loading: review.isPending,
          disabled: !allowed.includes('review'),
        },
        {
          id: 'reopen',
          label: 'Reopen',
          permission: 'dpr.review',
          allowedStatuses: ['submitted', 'reviewed'],
          color: 'warning',
          onClick: () => setReopenOpen(true),
          loading: reopen.isPending,
          disabled: !allowed.includes('reopen'),
        },
        {
          id: 'regenerate_pdf',
          label: 'Regenerate PDF',
          permission: 'dpr.review',
          allowedStatuses: ['submitted', 'reviewed'],
          onClick: () => {
            void (async () => {
              try {
                await regeneratePdf.mutateAsync(dpr.id);
                success('DPR PDF regenerated');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: regeneratePdf.isPending,
          disabled: !allowed.includes('regenerate_pdf'),
        },
      ]
    : [];

  const projectMismatch =
    Boolean(dpr) &&
    Boolean(selectedProjectId) &&
    dpr!.projectId !== selectedProjectId;

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={projectReady}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          Boolean(id) &&
          !detailQuery.isLoading &&
          !dpr &&
          !detailQuery.error
        }
        permissionTitle="Daily progress report unavailable"
        permissionMessage="You need the dpr.view permission to open daily progress reports."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project in the header before opening a DPR."
        notFoundTitle="Daily progress report not found"
        header={
          dpr ? (
            <DetailHeader
              title={dpr.dprNumber}
              subtitle={dprStatusLabel(dpr.status)}
              backTo="/daily-progress-reports"
              backLabel="Daily Progress Reports"
              meta={<DprStatusChip status={dpr.status} />}
            />
          ) : undefined
        }
        statusStrip={
          projectMismatch ? (
            <Typography color="warning.main" variant="body2">
              This DPR belongs to another project than the one selected in the
              header.
            </Typography>
          ) : dpr?.reopenReason ? (
            <Typography variant="body2" color="text.secondary">
              Last reopen reason: {dpr.reopenReason}
            </Typography>
          ) : undefined
        }
        summary={dpr ? <SummaryCards fields={summaryFields} /> : undefined}
        actionBar={
          dpr ? (
            <EntityActionBar
              status={dpr.status}
              actions={actions}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        tabs={
          dpr ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'labour',
                  label: 'Labour',
                  content: <DprLabourSection dpr={dpr} />,
                },
                {
                  id: 'work',
                  label: 'Work',
                  content: <DprWorkSection dpr={dpr} />,
                },
                {
                  id: 'materials',
                  label: 'Materials',
                  content: <DprMaterialsSection dpr={dpr} />,
                },
                {
                  id: 'issues',
                  label: 'Issues',
                  content: <DprIssuesSection dpr={dpr} />,
                },
                {
                  id: 'plan',
                  label: 'Plan',
                  content: <DprPlanSection dpr={dpr} />,
                },
                {
                  id: 'media',
                  label: 'Media',
                  content: (
                    <DprMediaGallery
                      photoDocumentIds={dpr.photoDocumentIds}
                      videoDocumentIds={dpr.videoDocumentIds}
                      canDownload={caps.canDownloadDocuments}
                    />
                  ),
                },
              ]}
            />
          ) : undefined
        }
      />

      <ReviewDprDialog
        open={reviewOpen}
        loading={review.isPending}
        onCancel={() => setReviewOpen(false)}
        onConfirm={(notes) => {
          if (!dpr) return;
          const parsed = validateReviewPayload(notes);
          if (!parsed.ok) {
            notifyError(parsed.message);
            return;
          }
          void (async () => {
            try {
              await review.mutateAsync({ id: dpr.id, input: parsed.payload });
              success('DPR marked as reviewed');
              setReviewOpen(false);
              await detailQuery.refetch();
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
              await reopen.mutateAsync({ id: dpr.id, input: { reason } });
              success('DPR reopened for corrections');
              setReopenOpen(false);
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
