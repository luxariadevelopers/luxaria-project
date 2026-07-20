import { Alert, Chip, Stack, Typography } from '@mui/material';
import { formatDate } from '@/format';
import { dprDayComplianceLabel, DPR_MISSING_CUTOFF_NOTE } from './labels';
import {
  deriveDayCompliance,
  indexDprsByDate,
  indexMissingAlertsByDate,
  reportDateKey,
} from './missingDay';
import type {
  DprDayCompliance,
  PublicDailyProgressReport,
  PublicMissingDprAlert,
} from './types';

type Props = {
  dprs: readonly PublicDailyProgressReport[];
  missingAlerts: readonly PublicMissingDprAlert[];
  /** Recent calendar days to evaluate (YYYY-MM-DD), newest first. */
  recentDates?: readonly string[];
};

function complianceColor(
  status: DprDayCompliance,
): 'default' | 'warning' | 'error' | 'success' | 'info' {
  switch (status) {
    case 'missing':
      return 'error';
    case 'awaiting_cutoff':
      return 'warning';
    case 'pending':
      return 'info';
    case 'complete':
      return 'success';
    default:
      return 'default';
  }
}

export function MissingDayIndicators({
  dprs,
  missingAlerts,
  recentDates = [],
}: Props) {
  const dprByDate = indexDprsByDate(dprs);
  const alertByDate = indexMissingAlertsByDate(missingAlerts);

  const missingCount = missingAlerts.length;
  const awaitingCount = recentDates.filter((date) => {
    const compliance = deriveDayCompliance({
      dpr: dprByDate.get(date) ?? null,
      missingAlert: alertByDate.get(date) ?? null,
    });
    return compliance === 'awaiting_cutoff';
  }).length;

  if (missingCount === 0 && awaitingCount === 0 && recentDates.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5} data-testid="dpr-missing-day-indicators">
      {missingCount > 0 ? (
        <Alert severity="error" variant="outlined">
          {missingCount} missing DPR
          {missingCount === 1 ? '' : 's'} flagged after evening evaluation.
        </Alert>
      ) : null}
      {awaitingCount > 0 ? (
        <Alert severity="warning" variant="outlined">
          {awaitingCount} recent day
          {awaitingCount === 1 ? '' : 's'} awaiting cut-off (no alert yet).{' '}
          {DPR_MISSING_CUTOFF_NOTE}
        </Alert>
      ) : null}
      {recentDates.length > 0 ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {recentDates.map((date) => {
            const compliance = deriveDayCompliance({
              dpr: dprByDate.get(date) ?? null,
              missingAlert: alertByDate.get(date) ?? null,
            });
            return (
              <Chip
                key={date}
                size="small"
                color={complianceColor(compliance)}
                variant="outlined"
                label={`${formatDate(date)} · ${dprDayComplianceLabel(compliance)}`}
                data-testid={`dpr-day-indicator-${reportDateKey(date)}`}
              />
            );
          })}
        </Stack>
      ) : null}
      {missingAlerts.length > 0 ? (
        <Typography variant="caption" color="text.secondary">
          {missingAlerts
            .slice(0, 5)
            .map((a) => `${formatDate(a.reportDate)}: ${a.message}`)
            .join(' · ')}
        </Typography>
      ) : null}
    </Stack>
  );
}
