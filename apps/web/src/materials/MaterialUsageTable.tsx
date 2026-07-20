import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState, RetryPanel } from '@/components/errors';
import { formatDate, formatQuantity } from '@/format';
import { materialUnitLabel, stockTransactionTypeLabel } from './labels';
import type { PublicStockLedgerEntry } from './types';

type Props = {
  rows: readonly PublicStockLedgerEntry[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
};

/**
 * Usage / movement references from `GET /stock-ledger?materialId&projectId`.
 */
export function MaterialUsageTable({
  rows,
  loading,
  error,
  onRetry,
}: Props) {
  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading && rows.length === 0) {
    return (
      <Typography color="text.secondary" data-testid="material-usage-table">
        Loading usage references…
      </Typography>
    );
  }

  if (rows.length === 0) {
    return (
      <div data-testid="material-usage-empty">
        <EmptyState
          title="No stock movements"
          description="No ledger entries for this material in the active project yet."
        />
      </div>
    );
  }

  return (
    <Paper variant="outlined" data-testid="material-usage-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Txn</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Reference</TableCell>
            <TableCell align="right">In</TableCell>
            <TableCell align="right">Out</TableCell>
            <TableCell>Location</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.transactionNumber}</TableCell>
              <TableCell>{formatDate(row.transactionDate)}</TableCell>
              <TableCell>
                {stockTransactionTypeLabel(row.transactionType)}
              </TableCell>
              <TableCell>
                {row.referenceType}
                {row.referenceId ? ` · ${row.referenceId}` : ''}
              </TableCell>
              <TableCell align="right">
                {row.quantityIn > 0
                  ? `${formatQuantity(row.quantityIn)} ${materialUnitLabel(row.unit)}`
                  : '—'}
              </TableCell>
              <TableCell align="right">
                {row.quantityOut > 0
                  ? `${formatQuantity(row.quantityOut)} ${materialUnitLabel(row.unit)}`
                  : '—'}
              </TableCell>
              <TableCell>{row.location?.trim() || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
