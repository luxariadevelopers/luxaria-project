import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { EmptyState } from '@/components/errors';
import { DrillDownNav } from '@/director-command-centre/DrillDownNav';
import { formatOptionalCount } from '@/director-command-centre/formatMetric';
import type { ProjectCriticalAlert } from '@/director-command-centre/projectDashboardTypes';

type Props = {
  alerts: readonly ProjectCriticalAlert[];
  loading?: boolean;
};

export function CriticalAlertsList({ alerts, loading = false }: Props) {
  if (loading) {
    return <Skeleton variant="rounded" height={80} />;
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No critical alerts"
        description="Stock, labour, DPR and payment exceptions for this project will appear here."
      />
    );
  }

  return (
    <Stack spacing={1} data-testid="project-critical-alerts">
      {alerts.map((alert) => (
        <Box
          key={alert.code}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor:
              alert.severity === 'critical' ? 'error.light' : 'warning.light',
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
              color={alert.severity === 'critical' ? 'error' : 'warning'}
              label={alert.severity}
            />
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              {alert.message}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatOptionalCount(alert.count)}
            </Typography>
          </Stack>
          <DrillDownNav links={alert.drillDown} />
        </Box>
      ))}
    </Stack>
  );
}
