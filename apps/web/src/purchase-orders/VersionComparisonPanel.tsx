import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr, formatQuantity } from '@/format';
import {
  buildRevisionComparison,
  type RevisionComparison,
} from './compareRevisions';
import { findPreviousRevision } from './revisionChain';
import type { PublicPurchaseOrder } from './types';

type Props = {
  current: PublicPurchaseOrder;
  chain: readonly PublicPurchaseOrder[];
};

function moneyCell(value: number | null): string {
  if (value == null) return '—';
  return formatInr(value);
}

function qtyCell(value: number | null): string {
  if (value == null) return '—';
  return formatQuantity(value);
}

/**
 * Side-by-side comparison of the previous revision vs the open version.
 */
export function VersionComparisonPanel({ current, chain }: Props) {
  const previous = findPreviousRevision(current, chain);

  if (!previous) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 2 }}
        data-testid="po-version-comparison-empty"
      >
        <Typography variant="body2" color="text.secondary">
          This is revision r{current.revisionNumber}. No prior revision is
          linked for comparison.
        </Typography>
      </Paper>
    );
  }

  const comparison: RevisionComparison = buildRevisionComparison(
    previous,
    current,
  );

  return (
    <Stack spacing={2} data-testid="po-version-comparison">
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
          Version comparison — r{comparison.previousRevisionNumber} → r
          {comparison.currentRevisionNumber}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {comparison.changedHeaderCount} header field
          {comparison.changedHeaderCount === 1 ? '' : 's'} and{' '}
          {comparison.changedLineCount} line
          {comparison.changedLineCount === 1 ? '' : 's'} changed. Issued POs
          are never edited in place — each revise creates a new draft.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Field</TableCell>
              <TableCell>Previous (r{previous.revisionNumber})</TableCell>
              <TableCell>Current (r{current.revisionNumber})</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comparison.header.map((row) => (
              <TableRow
                key={row.field}
                sx={{
                  bgcolor: row.changed ? 'action.hover' : undefined,
                }}
              >
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.previous}</TableCell>
                <TableCell>{row.current}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Line changes
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell align="right">Qty (prev)</TableCell>
              <TableCell align="right">Qty (curr)</TableCell>
              <TableCell align="right">Rate (prev)</TableCell>
              <TableCell align="right">Rate (curr)</TableCell>
              <TableCell align="right">Total (prev)</TableCell>
              <TableCell align="right">Total (curr)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comparison.lines.map((line) => (
              <TableRow
                key={line.key}
                sx={{
                  bgcolor: line.changed ? 'action.hover' : undefined,
                }}
              >
                <TableCell>{line.materialLabel}</TableCell>
                <TableCell align="right">{qtyCell(line.previousQty)}</TableCell>
                <TableCell align="right">{qtyCell(line.currentQty)}</TableCell>
                <TableCell align="right">
                  {moneyCell(line.previousRate)}
                </TableCell>
                <TableCell align="right">
                  {moneyCell(line.currentRate)}
                </TableCell>
                <TableCell align="right">
                  {moneyCell(line.previousTotal)}
                </TableCell>
                <TableCell align="right">
                  {moneyCell(line.currentTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
