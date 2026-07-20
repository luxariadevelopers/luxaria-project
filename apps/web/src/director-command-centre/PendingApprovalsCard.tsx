import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { DrillDownNav } from './DrillDownNav';
import {
  formatOptionalCount,
  formatOptionalMoney,
  hasMetric,
} from './formatMetric';
import type { MoneyTile } from './types';

type Props = {
  tile: MoneyTile | null;
  loading?: boolean;
};

/**
 * Pending purchase-request approvals tile from the command-centre summary
 * (`purchaseRequestsPending`). Also offers `/approvals` when permitted.
 */
export function PendingApprovalsCard({ tile, loading = false }: Props) {
  const { hasPermission } = useAuth();
  const canOpenApprovals = hasPermission('approval.view');
  const canOpenPr = hasPermission('purchase.view');

  return (
    <Box
      data-testid="director-pending-approvals"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'warning.light',
        borderRadius: 1,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Pending purchase approvals
      </Typography>
      {loading ? (
        <Skeleton width="40%" height={36} sx={{ mt: 0.5 }} />
      ) : (
        <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
          {hasMetric(tile?.count)
            ? formatOptionalCount(tile.count)
            : hasMetric(tile?.amount)
              ? formatOptionalMoney(tile.amount)
              : '—'}
        </Typography>
      )}
      {!loading && hasMetric(tile?.count) ? (
        <Typography variant="body2" color="text.secondary">
          {formatOptionalCount(tile.count)} request
          {tile.count === 1 ? '' : 's'}
          {hasMetric(tile.amount)
            ? ` · ${formatOptionalMoney(tile.amount)}`
            : ''}
        </Typography>
      ) : null}

      {!loading ? (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', mt: 1, alignItems: 'center' }}
        >
          <DrillDownNav links={tile?.drillDown ?? []} />
          {canOpenApprovals ? (
            <Button
              component={RouterLink}
              to="/approvals"
              size="small"
              variant="outlined"
            >
              Approvals inbox
            </Button>
          ) : null}
          {canOpenPr ? (
            <Button
              component={RouterLink}
              to="/procurement/purchase-requests"
              size="small"
              variant="text"
            >
              Purchase requests
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
