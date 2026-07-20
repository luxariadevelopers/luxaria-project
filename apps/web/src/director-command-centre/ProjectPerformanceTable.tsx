import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { EmptyState, RetryPanel } from '@/components/errors';
import { formatOptionalMoney } from './formatMetric';
import { ProgressBarCell } from './ProgressBarCell';
import {
  formatAsOfLabel,
  isAsOfDateStale,
  isLabourAsOfMismatched,
} from './stale';
import { VarianceIndicator } from './VarianceIndicator';
import {
  computeCostVariance,
  computeProgressGap,
  criticalAlertTotals,
} from './variance';
import type { ProjectDashboardSummary } from './projectDashboardTypes';

export type ProjectPerformanceRowState = {
  projectId: string;
  data?: ProjectDashboardSummary;
  error?: unknown;
  isError: boolean;
  isLoading: boolean;
  refetch: () => unknown;
};

type Props = {
  rows: readonly ProjectPerformanceRowState[];
  /** True while the first wave of fetches is in flight. */
  loading?: boolean;
  onRetryAll?: () => void;
};

export function ProjectPerformanceTable({
  rows,
  loading = false,
  onRetryAll,
}: Props) {
  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        title="No projects to compare"
        description="You have no accessible projects for the project performance table. Request project access or clear filters."
      />
    );
  }

  if (loading && rows.every((r) => r.isLoading)) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        data-testid="project-performance-loading"
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  const errorRows = rows.filter((r) => r.isError);

  return (
    <Stack spacing={1.5} data-testid="project-performance-table">
      {errorRows.length > 0 ? (
        <RetryPanel
          error={
            errorRows[0]?.error ??
            new Error(
              `${errorRows.length} project dashboard request(s) failed`,
            )
          }
          onRetry={onRetryAll}
          forceRetry
        />
      ) : null}

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Project</TableCell>
              <TableCell>As-of</TableCell>
              <TableCell>Physical</TableCell>
              <TableCell>Financial</TableCell>
              <TableCell>Gap</TableCell>
              <TableCell align="right">Budget</TableCell>
              <TableCell align="right">Actual</TableCell>
              <TableCell>Cost variance</TableCell>
              <TableCell align="right">Alerts</TableCell>
              <TableCell>Open</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <PerformanceRow key={row.projectId} row={row} />
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}

function PerformanceRow({ row }: { row: ProjectPerformanceRowState }) {
  if (row.isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={10}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading project…
            </Typography>
          </Stack>
        </TableCell>
      </TableRow>
    );
  }

  if (row.isError || !row.data) {
    return (
      <TableRow>
        <TableCell colSpan={10}>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography variant="body2" color="error">
              Failed to load project {row.projectId.slice(-6)}
            </Typography>
            <Button size="small" onClick={() => void row.refetch()}>
              Retry
            </Button>
          </Stack>
        </TableCell>
      </TableRow>
    );
  }

  const summary = row.data;
  const costVariance = computeCostVariance(summary);
  const progressGap = computeProgressGap(summary);
  const alerts = criticalAlertTotals(summary.criticalAlerts);
  const asOf = summary.filters.date;
  const stale = isAsOfDateStale(asOf);
  const labourMismatch = isLabourAsOfMismatched(
    summary.labourAttendance.asOfDate,
    asOf,
  );
  const financialLagging = progressGap.points < -5;

  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {summary.project.projectCode}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {summary.project.projectName}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
          {summary.project.projectStage} · {summary.project.status}
        </Typography>
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography
            variant="body2"
            color={stale ? 'warning.main' : 'text.primary'}
            sx={{ fontWeight: stale ? 700 : 400 }}
          >
            {formatAsOfLabel(asOf)}
          </Typography>
          {stale ? (
            <Tooltip title="As-of date is before today (UTC) — data may be stale">
              <WarningAmberOutlinedIcon
                fontSize="small"
                color="warning"
                data-testid="stale-as-of"
              />
            </Tooltip>
          ) : null}
        </Stack>
        {labourMismatch ? (
          <Typography
            variant="caption"
            color="warning.main"
            data-testid="stale-labour"
          >
            Labour as-of {formatAsOfLabel(summary.labourAttendance.asOfDate)}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell>
        <ProgressBarCell percent={summary.physicalCompletion.percent} />
      </TableCell>
      <TableCell>
        <ProgressBarCell
          percent={summary.financialCompletion.percent}
          warn={financialLagging}
        />
      </TableCell>
      <TableCell>
        <VarianceIndicator kind="progress" gap={progressGap} />
      </TableCell>
      <TableCell align="right">
        {formatOptionalMoney(costVariance.budgetAmount)}
      </TableCell>
      <TableCell align="right">
        {formatOptionalMoney(summary.actualCost.amount)}
      </TableCell>
      <TableCell>
        <VarianceIndicator kind="cost" variance={costVariance} />
      </TableCell>
      <TableCell align="right">
        {alerts.total === 0 ? (
          <Typography variant="body2" color="text.secondary">
            0
          </Typography>
        ) : (
          <Chip
            size="small"
            color={alerts.critical > 0 ? 'error' : 'warning'}
            label={alerts.total}
          />
        )}
      </TableCell>
      <TableCell>
        <Button
          component={RouterLink}
          to="/projects"
          size="small"
          variant="text"
          sx={{ px: 0.5, minWidth: 0 }}
        >
          Projects
        </Button>
      </TableCell>
    </TableRow>
  );
}
