import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { fetchAnalytics, type AnalyticsQuery } from './api';

export type AnalyticsViewConfig = {
  title: string;
  description: string;
  endpoint: string;
  permission: string;
  requiresProject?: boolean;
  showHorizon?: boolean;
  showKpi?: boolean;
  showReport?: boolean;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('en-IN') : '—';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function AnalyticsView({ config }: { config: AnalyticsViewConfig }) {
  const { hasPermission, access } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const [projectId, setProjectId] = useState(selectedProjectId ?? '');
  const [horizon, setHorizon] = useState('30');
  const [kpi, setKpi] = useState('receivables');
  const [report, setReport] = useState('director_daily_brief');

  const canView = Boolean(access) && hasPermission(config.permission);

  const query = useMemo((): AnalyticsQuery => {
    const q: AnalyticsQuery = {};
    if (projectId) q.projectId = projectId;
    if (config.showHorizon) q.horizon = horizon;
    if (config.showKpi) q.kpi = kpi;
    if (config.showReport) {
      q.report = report;
      q.format = 'csv';
    }
    return q;
  }, [projectId, horizon, kpi, report, config.showHorizon, config.showKpi, config.showReport]);

  const enabled =
    canView && (!config.requiresProject || Boolean(projectId));

  const result = useQuery({
    queryKey: ['analytics', config.endpoint, query],
    queryFn: () => fetchAnalytics<Record<string, unknown>>(config.endpoint, query),
    enabled,
    staleTime: 60_000,
  });

  if (access && !canView) {
    return (
      <PermissionDenied
        title={`${config.title} unavailable`}
        message={`You need the ${config.permission} permission.`}
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="analytics-view">
      <Typography color="text.secondary">{config.description}</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          select
          label="Project"
          size="small"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          sx={{ minWidth: 240 }}
          required={config.requiresProject}
        >
          {!config.requiresProject ? (
            <MenuItem value="">All accessible projects</MenuItem>
          ) : null}
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.projectCode} · {p.projectName}
            </MenuItem>
          ))}
        </TextField>
        {config.showHorizon ? (
          <TextField
            select
            label="Horizon"
            size="small"
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {['7', '30', '90', 'monthly', 'completion'].map((h) => (
              <MenuItem key={h} value={h}>
                {h}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {config.showKpi ? (
          <TextField
            select
            label="KPI"
            size="small"
            value={kpi}
            onChange={(e) => setKpi(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {[
              'receivables',
              'payables',
              'cash',
              'collections',
              'contractor_exposure',
              'cost_forecast',
              'inventory_exposure',
              'procurement_exposure',
            ].map((k) => (
              <MenuItem key={k} value={k}>
                {k}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {config.showReport ? (
          <TextField
            select
            label="Report"
            size="small"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            sx={{ minWidth: 260 }}
          >
            {[
              'director_daily_brief',
              'weekly_project_review',
              'monthly_management_accounts',
              'project_profitability',
              'budget_variance',
              'cash_flow_forecast',
              'sales_collection',
              'risk_register',
            ].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <Button
          variant="outlined"
          onClick={() => void result.refetch()}
          disabled={!enabled || result.isFetching}
        >
          Refresh
        </Button>
      </Stack>

      {config.requiresProject && !projectId ? (
        <Alert severity="info">Select a project to load analytics.</Alert>
      ) : null}

      {result.isLoading ? (
        <Box py={4} display="flex" justifyContent="center">
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {result.error ? (
        <Alert severity="error">
          {(result.error as Error).message || 'Failed to load analytics'}
        </Alert>
      ) : null}

      {result.data ? (
        <Box
          component="pre"
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: 'action.hover',
            overflow: 'auto',
            fontSize: 13,
            maxHeight: 640,
          }}
        >
          {formatValue(result.data)}
        </Box>
      ) : null}
    </Stack>
  );
}
