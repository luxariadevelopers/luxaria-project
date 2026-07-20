import { Box, Chip, Skeleton, Typography } from '@mui/material';
import { DrillDownNav } from '@/director-command-centre/DrillDownNav';
import {
  formatOptionalCount,
  formatOptionalMoney,
} from '@/director-command-centre/formatMetric';
import type { BankReconciliationPending } from './types';

type Props = {
  status: BankReconciliationPending | null;
  loading?: boolean;
};

export function ReconciliationStatusCard({
  status,
  loading = false,
}: Props) {
  return (
    <Box
      data-testid="finance-reconciliation-card"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Bank reconciliation
      </Typography>
      {loading || !status ? (
        <Skeleton width="70%" height={36} sx={{ mt: 0.5 }} />
      ) : (
        <>
          <Chip
            size="small"
            sx={{ mt: 1, mb: 1 }}
            color={
              !status.available
                ? 'default'
                : status.pendingCount > 0
                  ? 'warning'
                  : 'success'
            }
            label={
              !status.available
                ? 'Unavailable'
                : status.pendingCount > 0
                  ? 'Pending items'
                  : 'Clear'
            }
          />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {status.available
              ? formatOptionalMoney(status.amount)
              : '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatOptionalCount(status.pendingCount)} pending ·{' '}
            {status.message}
          </Typography>
          <DrillDownNav links={status.drillDown} />
        </>
      )}
    </Box>
  );
}
