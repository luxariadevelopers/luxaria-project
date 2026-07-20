import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { CategoryCostTable } from '@/cost-forecast/CategoryCostTable';
import {
  CostForecastFilters,
  todayIsoDate,
  toCostForecastQuery,
  type CostForecastFilterState,
} from '@/cost-forecast/CostForecastFilters';
import { CostSummaryCards } from '@/cost-forecast/CostSummaryCards';
import { CostTrendChart } from '@/cost-forecast/CostTrendChart';
import {
  aggregateCostSheetByCategory,
  buildCostTrendPoints,
  buildVarianceRows,
} from '@/cost-forecast/deriveCostForecast';
import { ReportGeneratedAt } from '@/cost-forecast/ReportGeneratedAt';
import { useCostForecast } from '@/cost-forecast/useCostForecast';
import { exportProjectCostSheet } from '@/cost-forecast/api';
import { VarianceDrillDownPanel } from '@/cost-forecast/VarianceDrillDownPanel';

/**
 * Project cost forecast — `/project-control/cost-forecast` (Micro Phase 086).
 * APIs: project cost sheet (`report.view`) + project dashboard (`dashboard.view`).
 */
export function CostForecastPage() {
  const { hasPermission, access } = useAuth();
  const { selectedProject, selectedProjectId } = useProject();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = useState<CostForecastFilterState>(() => ({
    date: todayIsoDate(),
    from: '',
    to: '',
  }));
  const [exporting, setExporting] = useState(false);

  const canViewReport = Boolean(access) && hasPermission('report.view');
  const canViewDashboard = Boolean(access) && hasPermission('dashboard.view');
  const canExport = Boolean(access) && hasPermission('report.export');
  const canView = canViewReport && canViewDashboard;

  const query = useMemo(
    () =>
      selectedProjectId
        ? toCostForecastQuery(selectedProjectId, filters)
        : null,
    [selectedProjectId, filters],
  );

  const forecast = useCostForecast(query, {
    enabled: canView,
    canViewReport,
    canViewDashboard,
  });

  const categoryRows = useMemo(
    () => aggregateCostSheetByCategory(forecast.viewModel.costSheet?.rows ?? []),
    [forecast.viewModel.costSheet?.rows],
  );

  const trendPoints = useMemo(
    () =>
      forecast.viewModel.dashboard
        ? buildCostTrendPoints(forecast.viewModel.dashboard)
        : [],
    [forecast.viewModel.dashboard],
  );

  const varianceRows = useMemo(
    () =>
      forecast.viewModel.dashboard
        ? buildVarianceRows(forecast.viewModel.dashboard)
        : [],
    [forecast.viewModel.dashboard],
  );

  const handleExport = async () => {
    if (!query || !canExport) {
      return;
    }
    setExporting(true);
    try {
      const { blob, filename } = await exportProjectCostSheet(query, 'xlsx');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Export failed',
        { variant: 'error' },
      );
    } finally {
      setExporting(false);
    }
  };

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Cost forecast unavailable"
        message="You need report.view and dashboard.view to open the project cost forecast."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project from the header to load budget, actual, commitments and forecast-to-complete."
      />
    );
  }

  const loading = forecast.isLoading || forecast.isFetching;
  const projectLabel = selectedProject
    ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
    : undefined;

  return (
    <Stack spacing={3} data-testid="cost-forecast-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography color="text.secondary">
          Budget, actual, commitments, forecast-to-complete and projected final
          cost — totals from the API (not recomputed in the browser).
        </Typography>
        {canExport ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={exporting || loading}
            onClick={() => void handleExport()}
          >
            Export cost sheet
          </Button>
        ) : null}
      </Stack>

      <CostForecastFilters
        value={filters}
        onChange={setFilters}
        projectLabel={projectLabel}
      />

      <ReportGeneratedAt generatedAt={forecast.viewModel.calculatedAt} />

      {forecast.isError ? (
        <RetryPanel
          error={forecast.error}
          onRetry={() => void forecast.refetch()}
          forceRetry
        />
      ) : null}

      {!forecast.isError ? (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            Summary
          </Typography>
          <CostSummaryCards
            summary={forecast.viewModel.dashboard}
            loading={loading}
          />

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            }}
          >
            <CostTrendChart points={trendPoints} loading={loading} />
            <VarianceDrillDownPanel rows={varianceRows} loading={loading} />
          </Box>

          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            Actual cost by category
          </Typography>
          <CategoryCostTable
            rows={categoryRows}
            totalCost={forecast.viewModel.costSheet?.totals.cost ?? null}
            loading={loading}
          />
        </>
      ) : null}
    </Stack>
  );
}
