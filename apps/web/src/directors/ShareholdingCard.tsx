import {
  Box,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatOptionalCount } from '@/director-command-centre/formatMetric';
import {
  formatShareholdingPercent,
  holdingForDirector,
  isSeedEqualShare,
} from './shareholdingDisplay';
import type { ActiveShareholdingSummary, PublicShareholding } from './types';

type Props = {
  summary: ActiveShareholdingSummary | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
  /** When set, highlight this director’s line. */
  focusDirectorId?: string;
  title?: string;
};

export function ShareholdingCard({
  summary,
  loading = false,
  error,
  onRetry,
  canView,
  focusDirectorId,
  title = 'Company shareholding',
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Shareholding unavailable"
        message="You need the shareholding.view permission to see equity holdings."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return (
      <RetryPanel error={error} onRetry={onRetry} forceRetry />
    );
  }

  const holdings = summary?.holdings ?? [];
  const focused = focusDirectorId
    ? holdingForDirector(holdings, focusDirectorId)
    : undefined;

  return (
    <Box
      data-testid="director-shareholding-card"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1.5, display: 'block' }}
      >
        {summary?.note ??
          'Company shareholding only — not project investment'}
      </Typography>

      {loading || !summary ? (
        <Skeleton variant="rounded" height={120} />
      ) : holdings.length === 0 ? (
        <EmptyState
          title="No active holdings"
          description="Approved company shareholding lines will appear here."
        />
      ) : (
        <Stack spacing={1.5}>
          {focused ? (
            <Typography
              variant="body1"
              sx={{ fontWeight: 600 }}
              data-testid="focused-shareholding-percent"
            >
              This director: {formatShareholdingPercent(focused.percentage)}
              {isSeedEqualShare(focused.percentage)
                ? ' (equal seed share)'
                : ''}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            Total {formatShareholdingPercent(summary.totalPercentage)}
            {summary.isBalanced ? ' · balanced' : ' · not balanced'}
          </Typography>
          <HoldingsTable
            holdings={holdings}
            focusDirectorId={focusDirectorId}
          />
        </Stack>
      )}
    </Box>
  );
}

function HoldingsTable({
  holdings,
  focusDirectorId,
}: {
  holdings: readonly PublicShareholding[];
  focusDirectorId?: string;
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Director</TableCell>
          <TableCell align="right">Shares</TableCell>
          <TableCell align="right">Face value</TableCell>
          <TableCell align="right">%</TableCell>
          <TableCell align="right">Version</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {holdings.map((row) => {
          const focused = row.directorId === focusDirectorId;
          return (
            <TableRow
              key={row.id}
              selected={focused}
              data-seed-share={
                isSeedEqualShare(row.percentage) ? 'true' : 'false'
              }
            >
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: focused ? 700 : 400,
                  }}
                >
                  {row.directorId.slice(-8)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {formatOptionalCount(row.numberOfShares)}
              </TableCell>
              <TableCell align="right">
                {formatOptionalCount(row.faceValue)}
              </TableCell>
              <TableCell
                align="right"
                data-testid={
                  focused ? 'focused-holding-percent-cell' : undefined
                }
              >
                {formatShareholdingPercent(row.percentage)}
              </TableCell>
              <TableCell align="right">
                {formatOptionalCount(row.version)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
