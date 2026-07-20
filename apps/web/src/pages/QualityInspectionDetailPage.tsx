import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
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
import { formatDate } from '@/format';
import { buildInspectionTimeline } from '@/quality-inspections/buildInspectionTimeline';
import { CancelInspectionDialog } from '@/quality-inspections/CancelInspectionDialog';
import { InspectionLinesGrid } from '@/quality-inspections/InspectionLinesGrid';
import {
  qualityInspectionResultLabel,
  qualityInspectionStatusLabel,
} from '@/quality-inspections/labels';
import {
  fromParameterGridRows,
  ParameterGrid,
  toParameterGridRows,
  type ParameterGridRow,
} from '@/quality-inspections/ParameterGrid';
import { QualityInspectionResultChip } from '@/quality-inspections/QualityInspectionResultChip';
import { QualityInspectionStatusChip } from '@/quality-inspections/QualityInspectionStatusChip';
import { resolveQualityInspectionCapabilities } from '@/quality-inspections/roleAccess';
import { ResultActions } from '@/quality-inspections/ResultActions';
import { SampleMediaPanel } from '@/quality-inspections/SampleMediaPanel';
import {
  useQualityInspectionDetail,
  useUpdateQualityInspection,
  useVendorQualityScore,
} from '@/quality-inspections/useQualityInspections';
import { resolveQualityInspectionRowActions } from '@/quality-inspections/workflowActions';
import { WorkflowTimeline } from '@/workflow-timeline';

/**
 * Quality inspection detail (Micro Phase 069).
 * Route: `/inventory/quality-inspections/:inspectionId`
 */
export function QualityInspectionDetailPage() {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveQualityInspectionCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');
  const [resultOpen, setResultOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paramRows, setParamRows] = useState<ParameterGridRow[] | null>(null);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useQualityInspectionDetail(
    inspectionId,
    canView && projectReady,
  );
  const inspection = detailQuery.data;

  const scoreQuery = useVendorQualityScore(
    inspection?.vendorId,
    canView && Boolean(inspection?.vendorId),
  );
  const update = useUpdateQualityInspection();

  const allowed = inspection
    ? resolveQualityInspectionRowActions(inspection, caps)
    : [];

  const editable = allowed.includes('edit');
  const parameters = paramRows ?? toParameterGridRows(inspection?.testParameters ?? []);

  const summaryFields = useMemo(() => {
    if (!inspection) return [];
    return [
      {
        id: 'date',
        label: 'Inspection date',
        value: formatDate(inspection.inspectionDate),
      },
      {
        id: 'grn',
        label: 'GRN id',
        value: inspection.grnId,
      },
      {
        id: 'vendor',
        label: 'Vendor id',
        value: inspection.vendorId,
      },
      {
        id: 'status',
        label: 'Status',
        value: qualityInspectionStatusLabel(inspection.status),
      },
      {
        id: 'result',
        label: 'Result',
        value: qualityInspectionResultLabel(inspection.result),
      },
      {
        id: 'score',
        label: 'Vendor score',
        value: scoreQuery.data
          ? `${scoreQuery.data.score} / 100 (${scoreQuery.data.ratingEquivalent}/5)`
          : '—',
      },
      {
        id: 'completed',
        label: 'Completed',
        value: inspection.completedAt
          ? formatDate(inspection.completedAt)
          : '—',
      },
      {
        id: 'lines',
        label: 'Lines',
        value: String(inspection.items.length),
      },
    ];
  }, [inspection, scoreQuery.data]);

  const lineDecisions = useMemo(
    () =>
      (inspection?.items ?? []).map((line) => ({
        grnLineId: line.grnLineId,
        receivedQuantity: line.receivedQuantity,
        acceptedQuantity: line.acceptedQuantity ?? 0,
        rejectedQuantity: line.rejectedQuantity ?? 0,
        rejectionReason: line.rejectionReason,
      })),
    [inspection],
  );

  const materialLabel = useMemo(() => {
    const map = new Map(
      (inspection?.items ?? []).map((line) => [
        line.grnLineId,
        [line.materialCode, line.materialName].filter(Boolean).join(' · ') ||
          line.grnLineId,
      ]),
    );
    return (grnLineId: string) => map.get(grnLineId) ?? grnLineId;
  }, [inspection]);

  const actions: EntityDetailAction[] = inspection
    ? [
        {
          id: 'complete',
          label: 'Record result',
          permission: 'quality.inspect',
          allowedStatuses: ['draft', 'in_progress'],
          color: 'success',
          onClick: () => setResultOpen(true),
          disabled: !allowed.includes('complete'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'quality.inspect',
          allowedStatuses: ['draft', 'in_progress'],
          color: 'error',
          variant: 'outlined',
          onClick: () => setCancelOpen(true),
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () => (inspection ? buildInspectionTimeline(inspection) : []),
    [inspection],
  );

  const saveParameters = async () => {
    if (!inspection) return;
    try {
      await update.mutateAsync({
        id: inspection.id,
        input: {
          testParameters: fromParameterGridRows(parameters),
        },
      });
      success('Test parameters saved');
      setParamRows(null);
      await detailQuery.refetch();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const persistMedia = async (
    field: 'samplePhotos' | 'testDocuments',
    ids: string[],
  ) => {
    if (!inspection || !editable) return;
    try {
      await update.mutateAsync({
        id: inspection.id,
        input: { [field]: ids },
      });
      success(field === 'samplePhotos' ? 'Sample photos saved' : 'Test documents saved');
      await detailQuery.refetch();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Quality inspection unavailable"
        message="You need the quality.view permission to open this inspection."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Quality inspection unavailable"
        message="The server denied access to this inspection (403)."
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
          !detailQuery.isLoading && !detailQuery.error && !inspection
        }
        permissionTitle="Quality inspection unavailable"
        permissionMessage="You need the quality.view permission to open this inspection."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project in the header before opening a quality inspection."
        notFoundTitle="Inspection not found"
        notFoundDescription="This inspection may belong to another project, or the id is invalid."
        header={
          inspection ? (
            <DetailHeader
              title={inspection.inspectionNumber}
              subtitle={qualityInspectionStatusLabel(inspection.status)}
              backTo="/inventory/quality-inspections"
              backLabel="Quality inspections"
              meta={
                <Stack direction="row" spacing={1}>
                  <QualityInspectionStatusChip status={inspection.status} />
                  <QualityInspectionResultChip result={inspection.result} />
                </Stack>
              }
            />
          ) : undefined
        }
        actionBar={
          inspection ? (
            <EntityActionBar
              actions={actions}
              status={inspection.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={
          inspection ? <SummaryCards fields={summaryFields} /> : undefined
        }
        tabs={
          inspection ? (
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
                        {inspection.remarks?.trim() ||
                          'No remarks on this inspection.'}
                      </Typography>
                      <InspectionLinesGrid
                        value={lineDecisions}
                        onChange={() => undefined}
                        materialLabel={materialLabel}
                        readOnly
                        title="GRN line quantities"
                      />
                      <ParameterGrid
                        value={parameters}
                        onChange={setParamRows}
                        readOnly={!editable}
                      />
                      {editable ? (
                        <Button
                          variant="outlined"
                          onClick={() => void saveParameters()}
                          disabled={update.isPending}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Save parameters
                        </Button>
                      ) : null}
                    </Stack>
                  ),
                },
                {
                  id: 'media',
                  label: 'Sample media',
                  content: (
                    <SampleMediaPanel
                      inspectionId={inspection.id}
                      projectId={inspection.projectId}
                      samplePhotos={inspection.samplePhotos}
                      testDocuments={inspection.testDocuments}
                      canUpload={editable && hasPermission('document.upload')}
                      onSamplePhotosChange={(ids) =>
                        void persistMedia('samplePhotos', ids)
                      }
                      onTestDocumentsChange={(ids) =>
                        void persistMedia('testDocuments', ids)
                      }
                    />
                  ),
                },
              ]}
            />
          ) : undefined
        }
        timeline={
          inspection ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              title="Lifecycle timeline"
            />
          ) : undefined
        }
      />

      {inspection ? (
        <>
          <ResultActions
            open={resultOpen}
            onClose={() => setResultOpen(false)}
            inspection={inspection}
            onCompleted={() => void detailQuery.refetch()}
          />
          <CancelInspectionDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            inspection={inspection}
            onCancelled={() => void detailQuery.refetch()}
          />
        </>
      ) : null}
    </>
  );
}
