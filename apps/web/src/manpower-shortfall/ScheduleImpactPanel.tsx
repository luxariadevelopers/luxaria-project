import {
  Alert,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState, RetryPanel } from '@/components/errors';
import { useManpowerComparison } from './useManpowerShortfall';

type Props = {
  projectId: string;
  contractorId: string | null;
  asOfDate: string;
  enabled: boolean;
  /** Fallback from selected alert when compare is unavailable. */
  expectedScheduleImpactDays?: number;
  shortfallPercent?: number;
};

/**
 * Agreed / planned / actual comparison + schedule impact.
 * Uses Nest `GET /manpower-planning/compare` when contractor is selected.
 */
export function ScheduleImpactPanel({
  projectId,
  contractorId,
  asOfDate,
  enabled,
  expectedScheduleImpactDays,
  shortfallPercent,
}: Props) {
  const compare = useManpowerComparison(
    contractorId
      ? { projectId, contractorId, asOfDate }
      : null,
    enabled && Boolean(contractorId),
  );

  if (!contractorId) {
    return (
      <EmptyState
        title="Select a contractor"
        description="Choose a contractor to load agreed vs planned vs actual manpower and schedule impact."
      />
    );
  }

  if (compare.isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (compare.error) {
    return (
      <RetryPanel
        error={compare.error}
        onRetry={() => void compare.refetch()}
        forceRetry
      />
    );
  }

  const data = compare.data;
  const impactDays =
    data?.workProgress.expectedScheduleImpactDays ??
    expectedScheduleImpactDays ??
    0;
  const shortfall =
    data?.shortfallPercent ?? shortfallPercent ?? 0;

  return (
    <Stack spacing={1.5} data-testid="schedule-impact-panel">
      <Typography variant="subtitle1">Schedule impact</Typography>
      {data ? (
        <Typography variant="body2">
          Agreed {data.agreementHeadcount} · Planned {data.plannedHeadcount} ·
          Actual {data.actualHeadcount} · Fill {data.fillRatePercent}% ·
          Shortfall {data.shortfallPercent}%
        </Typography>
      ) : null}
      <Alert
        severity={impactDays >= 2 || shortfall >= 40 ? 'error' : 'warning'}
      >
        Estimated schedule impact: {impactDays} day
        {impactDays === 1 ? '' : 's'}
        {data?.workProgress.behind
          ? ` · work progress behind plan (${data.workProgress.progressShortfallPercent}% short)`
          : null}
      </Alert>
    </Stack>
  );
}
