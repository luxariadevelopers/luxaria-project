import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  useProjectDetail,
  useUpdateProjectFinancialConfig,
} from './useProjects';
import {
  DEFAULT_PROJECT_FINANCIAL_CONFIG,
  type ProjectFinancialConfig,
} from './types';

type Props = {
  projectId?: string;
};

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function listToCsv(values: string[]): string {
  return values.join(', ');
}

export function ProjectFinancialSettingsPage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canUpdate =
    Boolean(access) &&
    hasPermission('project.view') &&
    hasPermission('project.update');
  const detailQuery = useProjectDetail(projectId, canUpdate);
  const updateMutation = useUpdateProjectFinancialConfig(projectId ?? '');

  const project = detailQuery.data;
  const [draft, setDraft] = useState<ProjectFinancialConfig>(
    DEFAULT_PROJECT_FINANCIAL_CONFIG,
  );
  const [costCentresCsv, setCostCentresCsv] = useState('');
  const [budgetCategoriesCsv, setBudgetCategoriesCsv] = useState('');
  const [gstText, setGstText] = useState('');

  useEffect(() => {
    if (!project) return;
    setDraft(project.financialConfig);
    setCostCentresCsv(listToCsv(project.financialConfig.costCentreCodes));
    setBudgetCategoriesCsv(
      listToCsv(project.financialConfig.budgetCategories),
    );
    setGstText(
      project.financialConfig.defaultGstPercent == null
        ? ''
        : String(project.financialConfig.defaultGstPercent),
    );
  }, [project]);

  if (!access || (canUpdate && detailQuery.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canUpdate ||
    (detailQuery.error && isForbiddenError(detailQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Financial settings unavailable"
        message="You need project.view, project.update, and explicit project access."
      />
    );
  }

  if (detailQuery.error || !project) {
    return (
      <RetryPanel
        error={detailQuery.error ?? new Error('Project not found')}
        onRetry={() => void detailQuery.refetch()}
        forceRetry
      />
    );
  }

  return (
    <Stack spacing={2.5} data-testid="project-financial-settings-page">
      <DetailHeader
        title={`${project.projectName} financial settings`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Financial configuration</Typography>
            <Typography variant="body2" color="text.secondary">
              Updates PATCH /projects/:id/financial-config. Use commas to
              separate lists.
            </Typography>
          </Stack>
          <TextField
            label="Cost centre codes"
            value={costCentresCsv}
            onChange={(event) => setCostCentresCsv(event.target.value)}
            helperText="Comma-separated"
            fullWidth
          />
          <TextField
            label="Profit centre code"
            value={draft.profitCentreCode ?? ''}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                profitCentreCode: event.target.value,
              }))
            }
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Default GST %"
              type="number"
              value={gstText}
              onChange={(event) => setGstText(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              fullWidth
            />
            <TextField
              label="Default currency"
              value={draft.defaultCurrency ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  defaultCurrency: event.target.value,
                }))
              }
              fullWidth
            />
          </Stack>
          <TextField
            label="Budget categories"
            value={budgetCategoriesCsv}
            onChange={(event) => setBudgetCategoriesCsv(event.target.value)}
            helperText="Comma-separated"
            fullWidth
          />
          <TextField
            label="Tax notes"
            value={draft.taxNotes ?? ''}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                taxNotes: event.target.value,
              }))
            }
            multiline
            minRows={3}
            fullWidth
          />
          <Button
            variant="contained"
            disabled={updateMutation.isPending}
            onClick={async () => {
              const gstTrimmed = gstText.trim();
              if (
                gstTrimmed !== '' &&
                (!Number.isFinite(Number(gstTrimmed)) || Number(gstTrimmed) < 0)
              ) {
                notify.error('Default GST % must be a non-negative number');
                return;
              }
              try {
                await updateMutation.mutateAsync({
                  costCentreCodes: csvToList(costCentresCsv),
                  profitCentreCode: draft.profitCentreCode?.trim() || null,
                  defaultGstPercent:
                    gstTrimmed === '' ? null : Number(gstTrimmed),
                  defaultCurrency: draft.defaultCurrency?.trim() || null,
                  taxNotes: draft.taxNotes?.trim() || null,
                  budgetCategories: csvToList(budgetCategoriesCsv),
                });
                notify.success('Financial settings saved');
              } catch (error) {
                notify.error(getErrorMessage(error));
              }
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            Save financial settings
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
