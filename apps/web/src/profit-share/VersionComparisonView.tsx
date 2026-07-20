import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatProfitSharePercent } from '@/project-participants/labels';
import { ParticipantStatusChip } from '@/project-participants/ParticipantStatusChip';
import {
  buildVersionComparison,
  countChangedLines,
  type VersionComparisonRow,
} from './compareVersions';
import type { AllocationLine } from './buildAllocationSchedule';

type Props = {
  lines: readonly AllocationLine[];
};

function deltaLabel(delta: number): string {
  if (Math.abs(delta) < 0.0001) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatProfitSharePercent(delta)}`;
}

export function VersionComparisonView({ lines }: Props) {
  const rows: VersionComparisonRow[] = buildVersionComparison(lines);
  const changed = countChangedLines(rows);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="profit-share-comparison"
    >
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        Version comparison
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Approved schedules stay immutable. Changes appear only on new draft /
        submitted versions ({changed} line{changed === 1 ? '' : 's'} changed).
      </Typography>

      {rows.length === 0 ? (
        <Typography color="text.secondary">
          No allocation lines to compare.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Participant</TableCell>
              <TableCell align="right">Approved %</TableCell>
              <TableCell align="right">Proposed %</TableCell>
              <TableCell align="right">Delta</TableCell>
              <TableCell>Pending</TableCell>
              <TableCell align="right">Versions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.participantKey}
                sx={{
                  bgcolor: row.changed ? 'action.hover' : undefined,
                }}
              >
                <TableCell>{row.label}</TableCell>
                <TableCell align="right">
                  {formatProfitSharePercent(row.approvedProfitShare)}
                </TableCell>
                <TableCell align="right">
                  {formatProfitSharePercent(row.proposedProfitShare)}
                </TableCell>
                <TableCell align="right">{deltaLabel(row.delta)}</TableCell>
                <TableCell>
                  {row.pendingStatus ? (
                    <ParticipantStatusChip status={row.pendingStatus} />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="right">
                  {row.approvedVersion != null || row.pendingVersion != null
                    ? `v${row.approvedVersion ?? '—'} → v${row.pendingVersion ?? '—'}`
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
