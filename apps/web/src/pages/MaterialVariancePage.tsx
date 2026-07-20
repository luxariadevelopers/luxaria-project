import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  ApprovalActions,
  ConsumptionWaterfall,
  ExplanationForm,
  STATUS_LABELS,
  VarianceTable,
  canEditExplanations,
  resolveMaterialVarianceCapabilities,
  useMaterialConsumptionPreview,
  useMaterialConsumptionReport,
  useMaterialConsumptionReports,
  useMaterialVarianceMutations,
  validateSubmitExplanations,
  type MaterialConsumptionLine,
  type MaterialConsumptionReport,
} from '@/material-variance';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';

function appendEvidenceNote(explanation: string, files: File[]): string {
  if (!files.length) return explanation.trim();
  const names = files.map((f) => f.name).join(', ');
  const suffix = `[Evidence: ${names}]`;
  const base = explanation.trim();
  return base ? `${base}\n${suffix}` : suffix;
}

function buildExplanationMap(report: MaterialConsumptionReport | undefined) {
  const map: Record<string, string> = {};
  for (const line of report?.lines ?? []) {
    if (line.explanation) {
      map[line.id] = line.explanation;
    }
  }
  return map;
}

/**
 * Material variance workspace — `/project-control/material-variance` (Micro Phase 085).
 *
 * Nest: `/material-consumption-reports/*`
 * Permissions: `material_consumption.view` | `.manage` | `.approve`
 */
export function MaterialVariancePage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveMaterialVarianceCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [evidenceByLine, setEvidenceByLine] = useState<Record<string, File[]>>({});
  const [validationIssues, setValidationIssues] = useState<
    Record<string, { explanation?: string; evidence?: string }>
  >({});
  const [previewRequested, setPreviewRequested] = useState(false);

  const reportsQuery = useMaterialConsumptionReports(
    selectedProjectId,
    caps.canView,
  );
  const reportQuery = useMaterialConsumptionReport(
    selectedReportId,
    caps.canView && Boolean(selectedReportId),
  );
  const previewQuery = useMaterialConsumptionPreview(
    previewRequested && selectedProjectId
      ? {
          projectId: selectedProjectId,
          periodFrom: periodFrom || undefined,
          periodTo: periodTo || undefined,
        }
      : null,
    previewRequested && caps.canView,
  );

  const mutations = useMaterialVarianceMutations(selectedProjectId);

  const activeReport = reportQuery.data ?? null;
  const displayLines = useMemo(() => {
    if (activeReport) return activeReport.lines;
    if (previewRequested && previewQuery.data) return previewQuery.data.lines;
    return [];
  }, [activeReport, previewQuery.data, previewRequested]);

  const selectedLine: MaterialConsumptionLine | null =
    displayLines.find((l) => l.id === selectedLineId) ?? null;

  const mergedExplanations = useMemo(() => {
    const base = buildExplanationMap(activeReport ?? undefined);
    return { ...base, ...explanations };
  }, [activeReport, explanations]);

  const handleSelectReport = (id: string) => {
    setSelectedReportId(id);
    setPreviewRequested(false);
    setSelectedLineId(null);
    setExplanations({});
    setEvidenceByLine({});
    setValidationIssues({});
  };

  const handleSaveExplanations = async () => {
    if (!activeReport || !caps.canManage) return;
    const payload = Object.entries(mergedExplanations)
      .filter(([, text]) => text.trim())
      .map(([lineId, text]) => ({
        lineId,
        explanation: appendEvidenceNote(text, evidenceByLine[lineId] ?? []),
      }));
    if (!payload.length) return;
    await mutations.update.mutateAsync({
      id: activeReport.id,
      input: { explanations: payload },
    });
    setExplanations({});
    setEvidenceByLine({});
  };

  const handleSubmit = async () => {
    if (!activeReport) return;
    const result = validateSubmitExplanations({
      lines: activeReport.lines,
      explanations: mergedExplanations,
      requireEvidenceWhenAboveThreshold: true,
      evidenceByLine,
    });
    if (!result.ok) {
      const next: Record<string, { explanation?: string; evidence?: string }> = {};
      for (const issue of result.issues) {
        if (!issue.lineId) continue;
        next[issue.lineId] = {
          ...next[issue.lineId],
          [issue.field === 'evidence' ? 'evidence' : 'explanation']: issue.message,
        };
      }
      setValidationIssues(next);
      return;
    }
    setValidationIssues({});
    if (Object.keys(explanations).length || Object.keys(evidenceByLine).length) {
      await handleSaveExplanations();
    }
    await mutations.submit.mutateAsync(activeReport.id);
  };

  const handleGenerate = async () => {
    if (!selectedProjectId || !caps.canManage) return;
    const row = await mutations.generate.mutateAsync({
      projectId: selectedProjectId,
      periodFrom: periodFrom || null,
      periodTo: periodTo || null,
      notes: null,
    });
    setSelectedReportId(row.id);
    setPreviewRequested(false);
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Material variance unavailable"
        message="You need the material_consumption.view permission to open material variance."
      />
    );
  }

  const listError = reportsQuery.error;
  if (listError && isForbiddenError(listError)) {
    return (
      <PermissionDenied
        error={listError}
        title="Material variance denied"
        message="You do not have permission to load material consumption reports."
      />
    );
  }

  const busy =
    mutations.generate.isPending ||
    mutations.update.isPending ||
    mutations.submit.isPending ||
    mutations.approve.isPending ||
    mutations.cancel.isPending;

  const submitValidation = activeReport
    ? validateSubmitExplanations({
        lines: activeReport.lines,
        explanations: mergedExplanations,
        requireEvidenceWhenAboveThreshold: true,
        evidenceByLine,
      })
    : { ok: true as const };

  return (
    <Stack spacing={2} data-testid="material-variance-page">
      <Stack spacing={0.5}>
        <Typography variant="h4">Material Variance</Typography>
        <Typography color="text.secondary">
          Compare theoretical vs actual material consumption, explain variances,
          and route reports through submit / approve workflow.
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Period from"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Period to"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setPreviewRequested(true)}
                disabled={!selectedProjectId || previewQuery.isFetching}
              >
                Preview
              </Button>
              {caps.canManage ? (
                <Button
                  variant="contained"
                  onClick={() => void handleGenerate()}
                  disabled={!selectedProjectId || busy}
                >
                  Generate report
                </Button>
              ) : null}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {previewQuery.error && previewRequested ? (
        <RetryPanel
          error={previewQuery.error}
          onRetry={() => void previewQuery.refetch()}
          forceRetry
        />
      ) : null}

      {reportsQuery.error && !isForbiddenError(reportsQuery.error) ? (
        <RetryPanel
          error={reportsQuery.error}
          onRetry={() => void reportsQuery.refetch()}
          forceRetry
        />
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Reports
            </Typography>
            {reportsQuery.isLoading ? (
              <Typography color="text.secondary">Loading…</Typography>
            ) : (reportsQuery.data ?? []).length === 0 ? (
              <EmptyState
                title="No reports yet"
                description={
                  caps.canManage
                    ? 'Preview consumption or generate a draft report for this project.'
                    : 'No material consumption reports are available.'
                }
              />
            ) : (
              <Stack spacing={1}>
                {(reportsQuery.data ?? []).map((report) => (
                  <Button
                    key={report.id}
                    variant={selectedReportId === report.id ? 'contained' : 'outlined'}
                    onClick={() => handleSelectReport(report.id)}
                    sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  >
                    <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {report.reportNumber}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[report.status] ?? report.status}
                        />
                        {report.requiresApproval ? (
                          <Chip size="small" color="warning" label="Needs approval" />
                        ) : null}
                      </Stack>
                    </Stack>
                  </Button>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {reportQuery.error && selectedReportId ? (
            <RetryPanel
              error={reportQuery.error}
              onRetry={() => void reportQuery.refetch()}
              forceRetry
            />
          ) : null}

          {!selectedReportId && !previewRequested ? (
            <EmptyState
              title="Select or generate a report"
              description="Choose a saved report or preview / generate consumption for the selected period."
            />
          ) : (
            <Stack spacing={2}>
              {activeReport ? (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Typography variant="h6">{activeReport.reportNumber}</Typography>
                  <Chip
                    label={STATUS_LABELS[activeReport.status] ?? activeReport.status}
                    size="small"
                  />
                  {activeReport.requiresApproval ? (
                    <Chip label="Variance approval required" color="warning" size="small" />
                  ) : null}
                </Stack>
              ) : previewRequested ? (
                <Typography variant="h6">Live preview (unsaved)</Typography>
              ) : null}

              <VarianceTable
                lines={displayLines}
                loading={reportQuery.isLoading || previewQuery.isFetching}
                onSelectLine={setSelectedLineId}
                explanationDrafts={mergedExplanations}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <ConsumptionWaterfall line={selectedLine} />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <ExplanationForm
                      line={selectedLine}
                      value={
                        selectedLineId
                          ? (mergedExplanations[selectedLineId] ?? '')
                          : ''
                      }
                      onChange={(value) => {
                        if (!selectedLineId) return;
                        setExplanations((prev) => ({
                          ...prev,
                          [selectedLineId]: value,
                        }));
                        setValidationIssues((prev) => {
                          const next = { ...prev };
                          delete next[selectedLineId];
                          return next;
                        });
                      }}
                      evidenceFiles={
                        selectedLineId ? (evidenceByLine[selectedLineId] ?? []) : []
                      }
                      onEvidenceChange={(files) => {
                        if (!selectedLineId) return;
                        setEvidenceByLine((prev) => ({
                          ...prev,
                          [selectedLineId]: files,
                        }));
                      }}
                      disabled={
                        !activeReport ||
                        !canEditExplanations(caps, activeReport.status)
                      }
                      error={
                        selectedLineId
                          ? (validationIssues[selectedLineId]?.explanation ?? null)
                          : null
                      }
                      evidenceError={
                        selectedLineId
                          ? (validationIssues[selectedLineId]?.evidence ?? null)
                          : null
                      }
                    />
                    {activeReport && canEditExplanations(caps, activeReport.status) ? (
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          onClick={() => void handleSaveExplanations()}
                          disabled={busy}
                        >
                          Save explanations
                        </Button>
                      </Box>
                    ) : null}
                  </Paper>
                </Grid>
              </Grid>

              {activeReport ? (
                <>
                  {!submitValidation.ok ? (
                    <Alert severity="warning">
                      Complete variance explanations (and evidence above threshold)
                      before submit.
                    </Alert>
                  ) : null}
                  <ApprovalActions
                    reportId={activeReport.id}
                    status={activeReport.status}
                    requiresApproval={activeReport.requiresApproval}
                    caps={caps}
                    busy={busy}
                    submitDisabled={!submitValidation.ok}
                    submitDisabledReason={
                      !submitValidation.ok
                        ? 'Explanation required on variance lines'
                        : undefined
                    }
                    onSubmit={() => void handleSubmit()}
                    onApprove={(comment) =>
                      void mutations.approve.mutateAsync({
                        id: activeReport.id,
                        input: { approvalComment: comment },
                      })
                    }
                    onCancel={() =>
                      void mutations.cancel.mutateAsync(activeReport.id)
                    }
                  />
                </>
              ) : null}
            </Stack>
          )}
        </Grid>
      </Grid>
    </Stack>
  );
}
