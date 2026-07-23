import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { KpiCard } from '@/director-command-centre/KpiCard';
import {
  formatOptionalMoney,
  formatOptionalPercent,
} from '@/director-command-centre/formatMetric';
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
  /** Compact company brief — hide duplicate KPI catalogue when company tiles exist. */
  variant?: 'default' | 'executive';
};

type DrillStep = { level?: string; label?: string; href?: string };

type KpiTile = {
  key?: string;
  label?: string;
  value?: number | null;
  unit?: string;
  drillPath?: DrillStep[];
};

type ProjectRow = {
  projectId?: string;
  projectCode?: string | null;
  projectName?: string | null;
  code?: string | null;
  name?: string | null;
  physicalProgressPercent?: number;
  financialProgressPercent?: number;
  marginForecast?: number | null;
  health?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asKpis(data: Record<string, unknown>): KpiTile[] {
  if (Array.isArray(data.kpis)) {
    return data.kpis.filter(isRecord) as KpiTile[];
  }
  return [];
}

function moneyOrCount(
  value: number | null | undefined,
  unit?: string,
): { amount?: number | null; count?: number | null } {
  if (unit === 'count' || unit === 'days') {
    return { count: value };
  }
  if (unit === 'percent') {
    return { amount: value };
  }
  return { amount: value };
}

function AnalyticsResultPanel({
  data,
  variant = 'default',
}: {
  data: Record<string, unknown>;
  variant?: 'default' | 'executive';
}) {
  const kpis = asKpis(data);
  const company = isRecord(data.company) ? data.company : null;
  const hideCatalogue = variant === 'executive' || Boolean(company);
  const projects = Array.isArray(data.projects)
    ? (data.projects.filter(isRecord) as ProjectRow[])
    : [];
  const buckets = Array.isArray(data.buckets)
    ? data.buckets.filter(isRecord)
    : [];
  const path = Array.isArray(data.path) ? data.path.filter(isRecord) : [];
  const rows = Array.isArray(data.rows) ? data.rows.filter(isRecord) : [];
  const columns = Array.isArray(data.columns)
    ? data.columns.map(String)
    : rows[0]
      ? Object.keys(rows[0])
      : [];

  const alerts = Array.isArray(data)
    ? []
    : Array.isArray((data as { alerts?: unknown }).alerts)
      ? ((data as { alerts: unknown[] }).alerts.filter(isRecord) as Array<
          Record<string, unknown>
        >)
      : [];

  // Alerts endpoint returns a bare array via fetchAnalytics unwrapping — handle list-shaped data upstream.
  const listAlerts = Array.isArray(data) ? [] : alerts;

  return (
    <Stack spacing={3}>
      {typeof data.asOf === 'string' || typeof data.generatedAt === 'string' ? (
        <Typography variant="caption" color="text.disabled">
          {typeof data.asOf === 'string'
            ? `As of ${String(data.asOf).slice(0, 10)}`
            : null}
          {typeof data.source === 'string' ? ` · ${data.source}` : null}
          {typeof data.generatedAt === 'string'
            ? ` · generated ${String(data.generatedAt).slice(11, 19)} UTC`
            : null}
        </Typography>
      ) : null}

      {company ? (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          <KpiCard
            title="Cash and bank"
            amount={company.cashAndBank as number | undefined}
          />
          <KpiCard
            title="Collections today"
            amount={company.collectionsToday as number | undefined}
          />
          <KpiCard
            title="Payments due"
            amount={company.paymentsDue as number | undefined}
            emphasize
          />
          <KpiCard
            title="Receivables"
            amount={company.receivables as number | undefined}
            emphasize
          />
          <KpiCard
            title="Payables"
            amount={company.payables as number | undefined}
          />
          <KpiCard
            title="Contractor liabilities"
            amount={company.contractorLiabilities as number | undefined}
          />
          <KpiCard
            title="Critical alerts"
            count={company.criticalAlertCount as number | undefined}
            countLabel="alerts"
          />
          <KpiCard
            title="Pending approvals"
            count={company.pendingApprovals as number | undefined}
            countLabel="items"
          />
        </Box>
      ) : null}

      {kpis.length > 0 && !company ? (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {kpis.map((kpi) => {
            const metric = moneyOrCount(kpi.value, kpi.unit);
            return (
              <KpiCard
                key={kpi.key ?? kpi.label}
                title={kpi.label ?? kpi.key ?? 'KPI'}
                amount={
                  kpi.unit === 'percent'
                    ? undefined
                    : metric.amount
                }
                count={
                  kpi.unit === 'count' || kpi.unit === 'days'
                    ? metric.count
                    : undefined
                }
                countLabel={kpi.unit === 'days' ? 'days' : 'items'}
                drillDown={(kpi.drillPath ?? [])
                  .filter((d) => d.label && d.href)
                  .map((d) => ({
                    label: String(d.label),
                    href: String(d.href),
                  }))}
              />
            );
          })}
        </Box>
      ) : null}

      {kpis.length > 0 && company && !hideCatalogue ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">KPI catalogue</Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: 'repeat(3, 1fr)',
              },
            }}
          >
            {kpis.map((kpi) => (
              <KpiCard
                key={`cat-${kpi.key ?? kpi.label}`}
                title={kpi.label ?? kpi.key ?? 'KPI'}
                amount={kpi.unit === 'count' ? undefined : kpi.value}
                count={kpi.unit === 'count' ? kpi.value : undefined}
                drillDown={(kpi.drillPath ?? [])
                  .filter((d) => d.label && d.href)
                  .map((d) => ({
                    label: String(d.label),
                    href: String(d.href),
                  }))}
              />
            ))}
          </Box>
        </Stack>
      ) : null}

      {/* Cost / health / profitability scalar tiles */}
      {!company && kpis.length === 0 ? (
        <ScalarTiles data={data} />
      ) : null}

      {projects.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Project health</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell align="right">Physical %</TableCell>
                <TableCell align="right">Financial %</TableCell>
                <TableCell align="right">Margin forecast</TableCell>
                <TableCell>Health</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.projectId ?? p.projectCode ?? p.code}>
                  <TableCell>
                    {(p.projectCode ?? p.code) ?? '—'}
                    {(p.projectName ?? p.name)
                      ? ` · ${p.projectName ?? p.name}`
                      : ''}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalPercent(p.physicalProgressPercent)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalPercent(p.financialProgressPercent)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(p.marginForecast)}
                  </TableCell>
                  <TableCell>
                    {p.health ? (
                      <Chip
                        size="small"
                        label={p.health}
                        color={
                          p.health === 'green'
                            ? 'success'
                            : p.health === 'amber'
                              ? 'warning'
                              : p.health === 'red'
                                ? 'error'
                                : 'default'
                        }
                        variant="outlined"
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      ) : null}

      {typeof data.emptyReason === 'string' ? (
        <Alert severity="info">{data.emptyReason}</Alert>
      ) : null}

      {buckets.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">
            Cash-flow buckets
            {typeof data.openingCash === 'number'
              ? ` · opening ${formatOptionalMoney(data.openingCash)}`
              : ''}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell align="right">Inflows</TableCell>
                <TableCell align="right">Outflows</TableCell>
                <TableCell align="right">Net</TableCell>
                <TableCell align="right">Funding gap</TableCell>
                <TableCell align="right">Closing cash</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {buckets.map((b) => (
                <TableRow key={String(b.label ?? b.periodStart)}>
                  <TableCell>{String(b.label ?? '—')}</TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(b.inflows as number | undefined)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(b.outflows as number | undefined)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(b.net as number | undefined)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(b.fundingGap as number | undefined)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(b.closingCash as number | undefined)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      ) : null}

      {path.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">
            Drill-down path
            {typeof data.kpi === 'string' ? ` · ${data.kpi}` : ''}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {path.map((step, index) => (
              <Chip
                key={`${String(step.level)}-${index}`}
                label={`${index + 1}. ${String(step.label ?? step.level ?? 'step')}`}
                variant="outlined"
                size="small"
              />
            ))}
          </Stack>
        </Stack>
      ) : null}

      {listAlerts.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Alerts</Typography>
          {listAlerts.map((alert, index) => (
            <Alert
              key={String(alert.id ?? index)}
              severity={
                alert.severity === 'critical'
                  ? 'error'
                  : alert.severity === 'warning'
                    ? 'warning'
                    : 'info'
              }
            >
              <strong>{String(alert.title ?? alert.code ?? 'Alert')}</strong>
              {' — '}
              {String(alert.message ?? '')}
            </Alert>
          ))}
        </Stack>
      ) : null}

      {rows.length > 0 && columns.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">
            Report
            {typeof data.report === 'string' ? ` · ${data.report}` : ''}
            {typeof data.format === 'string' ? ` (${data.format})` : ''}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((col) => (
                    <TableCell key={col}>
                      {formatCell(row[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      ) : null}

      {!company &&
      kpis.length === 0 &&
      projects.length === 0 &&
      buckets.length === 0 &&
      path.length === 0 &&
      rows.length === 0 &&
      listAlerts.length === 0 ? (
        <Alert severity="info">
          No KPI tiles for this view yet. Try another analytics page or select a
          project.
        </Alert>
      ) : null}
    </Stack>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('en-IN') : '—';
  }
  return String(value);
}

/** Render common scalar forecast / health fields as KPI cards. */
function ScalarTiles({ data }: { data: Record<string, unknown> }) {
  const cost = isRecord(data.cost) ? data.cost : null;
  const tiles: Array<{ title: string; amount?: number | null; count?: number | null; unit?: string }> =
    [];

  const pushMoney = (title: string, value: unknown) => {
    if (typeof value === 'number') tiles.push({ title, amount: value });
  };
  const pushCount = (title: string, value: unknown) => {
    if (typeof value === 'number') tiles.push({ title, count: value });
  };
  const pushPercent = (title: string, value: unknown) => {
    if (typeof value === 'number') {
      tiles.push({
        title: `${title} · ${formatOptionalPercent(value)}`,
        count: Math.round(value),
      });
    }
  };

  pushPercent('Physical progress', data.physicalProgressPercent);
  pushPercent('Financial progress', data.financialProgressPercent);
  pushMoney('Revenue', data.revenue);
  pushMoney('Collections', data.collections);
  pushMoney('Receivables', data.receivables);
  pushMoney('Payables', data.payables);
  pushMoney('Margin', data.margin);
  pushPercent('Margin %', data.marginPercent);
  pushPercent('Collection efficiency', data.collectionEfficiency);
  pushMoney('Capital deployed', data.capitalDeployed);
  pushPercent('Return on capital', data.returnOnCapital);
  pushMoney('Cash position', data.cashPosition);
  pushMoney('Estimate at completion', data.estimateAtCompletion);
  pushCount('Critical issues', data.criticalIssueCount);
  pushCount('Delays', data.delays);

  if (cost) {
    pushMoney('Original budget', cost.originalBudget);
    pushMoney('Revised budget', cost.revisedBudget);
    pushMoney('Actual cost', cost.actualCost);
    pushMoney('Committed cost', cost.committedCost);
    pushMoney('ETC', cost.estimateToComplete);
    pushMoney('EAC', cost.estimateAtCompletion);
    pushMoney('VAC', cost.varianceAtCompletion);
  }

  // Opening cash when buckets absent
  pushMoney('Opening cash', data.openingCash);

  if (tiles.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
      }}
    >
      {tiles.map((tile) => (
        <KpiCard
          key={tile.title}
          title={tile.title}
          amount={tile.amount}
          count={tile.count}
        />
      ))}
    </Box>
  );
}

function AlertsListPanel({ alerts }: { alerts: Array<Record<string, unknown>> }) {
  if (alerts.length === 0) {
    return <Alert severity="success">No open risk alerts.</Alert>;
  }
  return (
    <Stack spacing={1}>
      {alerts.map((alert, index) => (
        <Alert
          key={String(alert.id ?? index)}
          severity={
            alert.severity === 'critical'
              ? 'error'
              : alert.severity === 'warning'
                ? 'warning'
                : 'info'
          }
        >
          <strong>{String(alert.title ?? alert.code ?? 'Alert')}</strong>
          {' — '}
          {String(alert.message ?? '')}
          {alert.status ? (
            <Typography component="span" variant="caption" color="text.secondary">
              {' '}
              ({String(alert.status)})
            </Typography>
          ) : null}
        </Alert>
      ))}
    </Stack>
  );
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
  }, [
    projectId,
    horizon,
    kpi,
    report,
    config.showHorizon,
    config.showKpi,
    config.showReport,
  ]);

  const enabled = canView && (!config.requiresProject || Boolean(projectId));

  const result = useQuery({
    queryKey: ['analytics', config.endpoint, query],
    queryFn: () =>
      fetchAnalytics<Record<string, unknown> | Array<Record<string, unknown>>>(
        config.endpoint,
        query,
      ),
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

  const payload = result.data;
  const isAlertList = Array.isArray(payload);

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
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {result.error ? (
        <Alert severity="error">
          {(result.error as Error).message || 'Failed to load analytics'}
        </Alert>
      ) : null}

      {payload && isAlertList ? (
        <AlertsListPanel alerts={payload} />
      ) : null}

      {payload && !isAlertList ? (
        <AnalyticsResultPanel data={payload} variant={config.variant} />
      ) : null}

      {!result.isLoading &&
      !result.error &&
      !payload &&
      enabled ? (
        <Alert severity="info">No analytics data returned.</Alert>
      ) : null}
    </Stack>
  );
}
