import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  getErrorMessage,
  isForbiddenError,
  isUnauthorizedError,
} from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { QuickCreateCostCentreDialog } from '@/cost-centres/QuickCreateCostCentreDialog';
import {
  CostCentreKind,
  CostCentreStatus,
  type CostCentreKind as CostCentreKindValue,
  type CostCentreListRow,
} from '@/cost-centres/types';
import { useCostCentresList } from '@/cost-centres/useCostCentres';
import { BUDGET_CATEGORY_PRESETS } from './budgetCategoryOptions';
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

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'AED', 'GBP', 'SGD'] as const;

function centreLabel(row: Pick<CostCentreListRow, 'code' | 'name'>): string {
  return `${row.code} · ${row.name}`;
}

function applicableToProject(
  rows: CostCentreListRow[],
  projectId: string,
): CostCentreListRow[] {
  return rows.filter(
    (row) => !row.projectId || row.projectId === projectId,
  );
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
  const canViewCostCentres = hasPermission('cost_centre.view');
  const canManageCostCentres = hasPermission('cost_centre.manage');
  const detailQuery = useProjectDetail(projectId, canUpdate);
  const updateMutation = useUpdateProjectFinancialConfig(projectId ?? '');

  const costCentresQuery = useCostCentresList(
    {
      page: 1,
      limit: 100,
      kind: CostCentreKind.CostCentre,
      status: CostCentreStatus.Active,
    },
    canUpdate && canViewCostCentres,
  );
  const profitCentresQuery = useCostCentresList(
    {
      page: 1,
      limit: 100,
      kind: CostCentreKind.ProfitCentre,
      status: CostCentreStatus.Active,
    },
    canUpdate && canViewCostCentres,
  );

  const project = detailQuery.data;
  const [draft, setDraft] = useState<ProjectFinancialConfig>(
    DEFAULT_PROJECT_FINANCIAL_CONFIG,
  );
  const [selectedCostCentres, setSelectedCostCentres] = useState<
    CostCentreListRow[]
  >([]);
  const [selectedProfitCentre, setSelectedProfitCentre] =
    useState<CostCentreListRow | null>(null);
  const [budgetCategories, setBudgetCategories] = useState<string[]>([]);
  const [customBudgetCategory, setCustomBudgetCategory] = useState('');
  const [gstText, setGstText] = useState('');
  const [centresHydrated, setCentresHydrated] = useState(false);
  const [createKind, setCreateKind] = useState<CostCentreKindValue | null>(
    null,
  );

  const costCentreOptions = useMemo(
    () =>
      applicableToProject(
        costCentresQuery.data?.items ?? [],
        projectId ?? '',
      ),
    [costCentresQuery.data?.items, projectId],
  );
  const profitCentreOptions = useMemo(
    () =>
      applicableToProject(
        profitCentresQuery.data?.items ?? [],
        projectId ?? '',
      ),
    [profitCentresQuery.data?.items, projectId],
  );

  const budgetCategoryOptions = useMemo(() => {
    const selected = new Set(
      budgetCategories.map((item) => item.trim().toLowerCase()),
    );
    return BUDGET_CATEGORY_PRESETS.filter(
      (item) => !selected.has(item.toLowerCase()),
    );
  }, [budgetCategories]);

  useEffect(() => {
    if (!project) return;
    setDraft(project.financialConfig);
    setBudgetCategories([...project.financialConfig.budgetCategories]);
    setGstText(
      project.financialConfig.defaultGstPercent == null
        ? ''
        : String(project.financialConfig.defaultGstPercent),
    );
    setCentresHydrated(false);
  }, [project]);

  // Map saved codes onto master rows once both project + lists are ready.
  useEffect(() => {
    if (!project || centresHydrated) return;
    if (canViewCostCentres && (costCentresQuery.isLoading || profitCentresQuery.isLoading)) {
      return;
    }

    const savedCodes = project.financialConfig.costCentreCodes;
    const byCode = new Map(
      costCentreOptions.map((row) => [row.code, row] as const),
    );
    setSelectedCostCentres(
      savedCodes.map(
        (code) =>
          byCode.get(code) ?? {
            id: `saved:${code}`,
            code,
            name: 'Saved code (not in master list)',
            kind: CostCentreKind.CostCentre,
            projectId: project.id,
            status: CostCentreStatus.Active,
          },
      ),
    );

    const profitCode = project.financialConfig.profitCentreCode;
    if (profitCode) {
      setSelectedProfitCentre(
        profitCentreOptions.find((row) => row.code === profitCode) ?? {
          id: `saved:${profitCode}`,
          code: profitCode,
          name: 'Saved code (not in master list)',
          kind: CostCentreKind.ProfitCentre,
          projectId: project.id,
          status: CostCentreStatus.Active,
        },
      );
    } else {
      setSelectedProfitCentre(null);
    }

    setCentresHydrated(true);
  }, [
    project,
    centresHydrated,
    canViewCostCentres,
    costCentresQuery.isLoading,
    profitCentresQuery.isLoading,
    costCentreOptions,
    profitCentreOptions,
  ]);

  const addCustomBudgetCategory = () => {
    const next = customBudgetCategory.trim();
    if (!next) return;
    const exists = budgetCategories.some(
      (item) => item.toLowerCase() === next.toLowerCase(),
    );
    if (exists) {
      notify.error('That budget category is already selected');
      return;
    }
    setBudgetCategories((prev) => [...prev, next]);
    setCustomBudgetCategory('');
  };

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

  const currencyValue =
    (draft.defaultCurrency?.trim() || project.currency || 'INR').toUpperCase();
  const currencyChoices = Array.from(
    new Set<string>([...CURRENCY_OPTIONS, currencyValue, project.currency]),
  );

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
              Cost and profit centres tag project spend and P&amp;L. Use + to
              create a missing master here, or manage the full list under
              Accounting → Cost centres. GST and tax notes are project defaults.
            </Typography>
          </Stack>

          {!canViewCostCentres ? (
            <Alert severity="info">
              You need <strong>cost_centre.view</strong> to pick centres from
              the master list. Saved codes still load if present.
            </Alert>
          ) : null}

          {canViewCostCentres && !canManageCostCentres ? (
            <Alert severity="info">
              You can select centres here. Creating new ones needs{' '}
              <strong>cost_centre.manage</strong>.
            </Alert>
          ) : null}

          {canViewCostCentres &&
          (costCentresQuery.isError || profitCentresQuery.isError) ? (
            <Alert severity="warning">
              Cost / profit centres could not be loaded.{' '}
              <Button
                size="small"
                onClick={() => {
                  void costCentresQuery.refetch();
                  void profitCentresQuery.refetch();
                }}
              >
                Retry
              </Button>
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Autocomplete
              multiple
              options={costCentreOptions}
              value={selectedCostCentres}
              loading={canViewCostCentres && costCentresQuery.isLoading}
              getOptionLabel={centreLabel}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              onChange={(_, value) => setSelectedCostCentres(value)}
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cost centres"
                  helperText={
                    <>
                      Select active cost centres for this project.{' '}
                      <Link
                        component={RouterLink}
                        to="/accounting/cost-centres"
                        underline="hover"
                      >
                        Manage cost centres
                      </Link>
                    </>
                  }
                />
              )}
            />
            <Tooltip
              title={
                canManageCostCentres
                  ? 'Add cost centre'
                  : 'Needs cost_centre.manage'
              }
            >
              <span>
                <IconButton
                  color="primary"
                  aria-label="Add cost centre"
                  disabled={!canManageCostCentres}
                  onClick={() => setCreateKind(CostCentreKind.CostCentre)}
                  sx={{ mt: 0.5 }}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Autocomplete
              options={profitCentreOptions}
              value={selectedProfitCentre}
              loading={canViewCostCentres && profitCentresQuery.isLoading}
              getOptionLabel={centreLabel}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              onChange={(_, value) => setSelectedProfitCentre(value)}
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Profit centre"
                  helperText="Optional — one profit centre for this project"
                />
              )}
            />
            <Tooltip
              title={
                canManageCostCentres
                  ? 'Add profit centre'
                  : 'Needs cost_centre.manage'
              }
            >
              <span>
                <IconButton
                  color="primary"
                  aria-label="Add profit centre"
                  disabled={!canManageCostCentres}
                  onClick={() => setCreateKind(CostCentreKind.ProfitCentre)}
                  sx={{ mt: 0.5 }}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Default GST %"
              type="number"
              value={gstText}
              onChange={(event) => setGstText(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              helperText="Leave blank for no default"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="financial-currency">Default currency</InputLabel>
              <Select
                labelId="financial-currency"
                label="Default currency"
                value={currencyValue}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    defaultCurrency: event.target.value,
                  }))
                }
              >
                {currencyChoices.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                    {code === project.currency ? ' (project currency)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Autocomplete
            multiple
            options={budgetCategoryOptions}
            value={budgetCategories}
            onChange={(_, value) =>
              setBudgetCategories(
                value
                  .map((item) => String(item).trim())
                  .filter(Boolean),
              )
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Budget categories"
                helperText="Pick from common construction budget heads. Remove a chip to drop it."
              />
            )}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label="Add missing budget category"
              value={customBudgetCategory}
              onChange={(event) => setCustomBudgetCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustomBudgetCategory();
                }
              }}
              helperText="Type a category that is not in the list, then Add"
              fullWidth
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addCustomBudgetCategory}
              disabled={!customBudgetCategory.trim()}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, mt: { sm: 1 } }}
            >
              Add
            </Button>
          </Stack>

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
                  costCentreCodes: selectedCostCentres.map((row) => row.code),
                  profitCentreCode: selectedProfitCentre?.code ?? null,
                  defaultGstPercent:
                    gstTrimmed === '' ? null : Number(gstTrimmed),
                  defaultCurrency: currencyValue || null,
                  taxNotes: draft.taxNotes?.trim() || null,
                  budgetCategories,
                });
                notify.success('Financial settings saved');
              } catch (error) {
                if (isUnauthorizedError(error)) {
                  notify.error(
                    'Session expired. Log in again, then save financial settings.',
                  );
                  return;
                }
                notify.error(getErrorMessage(error));
              }
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            Save financial settings
          </Button>
        </Stack>
      </Paper>

      {createKind ? (
        <QuickCreateCostCentreDialog
          open
          kind={createKind}
          projectId={project.id}
          projectCode={project.projectCode}
          projectName={project.projectName}
          onClose={() => setCreateKind(null)}
          onCreated={async (row) => {
            if (row.kind === CostCentreKind.CostCentre) {
              await costCentresQuery.refetch();
              setSelectedCostCentres((prev) =>
                prev.some((item) => item.code === row.code)
                  ? prev
                  : [...prev, row],
              );
            } else {
              await profitCentresQuery.refetch();
              setSelectedProfitCentre(row);
            }
            notify.success(
              row.kind === CostCentreKind.ProfitCentre
                ? 'Profit centre created'
                : 'Cost centre created',
            );
          }}
        />
      ) : null}
    </Stack>
  );
}
