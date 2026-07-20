import { Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { BoqVersionComparison } from './types';

type Props = {
  comparison: BoqVersionComparison;
};

export function ImpactSummary({ comparison }: Props) {
  const { summary, fromVersion, toVersion } = comparison;

  return (
    <Stack
      spacing={1}
      sx={{
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
      data-testid="boq-impact-summary"
    >
      <Typography variant="subtitle1">Impact summary</Typography>
      <Typography variant="body2" color="text.secondary">
        Comparing v{fromVersion.versionNumber} → v{toVersion.versionNumber}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
        <Typography variant="body2">
          Added: <strong>{summary.addedCount}</strong>
        </Typography>
        <Typography variant="body2">
          Removed: <strong>{summary.removedCount}</strong>
        </Typography>
        <Typography variant="body2">
          Changed: <strong>{summary.changedCount}</strong>
        </Typography>
        <Typography variant="body2">
          Unchanged: <strong>{summary.unchangedCount}</strong>
        </Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Typography variant="body2">
          From total: {formatInr(summary.fromTotalPlannedValue)}
        </Typography>
        <Typography variant="body2">
          To total: {formatInr(summary.toTotalPlannedValue)}
        </Typography>
        <Typography variant="body2">
          Cost impact:{' '}
          <strong>
            {summary.costImpact >= 0 ? '+' : ''}
            {formatInr(summary.costImpact)}
          </strong>
        </Typography>
      </Stack>
      {(toVersion.timeImpact !== 0 || fromVersion.timeImpact !== 0) && (
        <Typography variant="body2">
          Version time impact (days): to={toVersion.timeImpact}, from=
          {fromVersion.timeImpact}
        </Typography>
      )}
    </Stack>
  );
}
