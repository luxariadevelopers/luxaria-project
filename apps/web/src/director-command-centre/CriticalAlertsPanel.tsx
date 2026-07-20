import {
  Box,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState } from '@/components/errors';
import { DrillDownNav } from './DrillDownNav';
import { formatOptionalCount } from './formatMetric';
import type { AlertSummary, CriticalException } from './types';

type Props = {
  exceptions: readonly CriticalException[];
  materialAlerts: AlertSummary | null;
  labourAlerts: AlertSummary | null;
  loading?: boolean;
};

export function CriticalAlertsPanel({
  exceptions,
  materialAlerts,
  labourAlerts,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <Stack spacing={1} data-testid="director-critical-alerts-loading">
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={64} />
      </Stack>
    );
  }

  const hasExceptions = exceptions.length > 0;
  const hasMaterial = (materialAlerts?.count ?? 0) > 0;
  const hasLabour = (labourAlerts?.count ?? 0) > 0;

  if (!hasExceptions && !hasMaterial && !hasLabour) {
    return (
      <EmptyState
        title="No critical alerts"
        description="Overdue payments, matching exceptions, stock and labour shortfalls will appear here."
      />
    );
  }

  return (
    <Stack spacing={1.5} data-testid="director-critical-alerts">
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Critical alerts
      </Typography>
      {exceptions.map((ex) => (
        <Box
          key={ex.code}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor:
              ex.severity === 'critical' ? 'error.light' : 'warning.light',
            borderRadius: 1,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Chip
              size="small"
              color={ex.severity === 'critical' ? 'error' : 'warning'}
              label={ex.severity}
            />
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              {ex.message}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatOptionalCount(ex.count)}
            </Typography>
          </Stack>
          <DrillDownNav links={ex.drillDown} />
        </Box>
      ))}

      {hasMaterial && materialAlerts ? (
        <AlertBucket
          title="Material stock alerts"
          count={materialAlerts.count}
          drillDown={materialAlerts.drillDown}
        />
      ) : null}
      {hasLabour && labourAlerts ? (
        <AlertBucket
          title="Labour shortfall"
          count={labourAlerts.count}
          drillDown={labourAlerts.drillDown}
        />
      ) : null}
    </Stack>
  );
}

function AlertBucket({
  title,
  count,
  drillDown,
}: {
  title: string;
  count: number;
  drillDown: CriticalException['drillDown'];
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle2">
        {title} · {formatOptionalCount(count)}
      </Typography>
      <DrillDownNav links={drillDown} />
    </Box>
  );
}
