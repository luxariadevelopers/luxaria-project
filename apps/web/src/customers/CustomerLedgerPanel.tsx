import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import type { CustomerLedgerReport } from './types';

type Props = {
  ledger: CustomerLedgerReport | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

/**
 * Customer party ledger — `GET /accounting-reports/customer-ledger?partyId=`
 * (`report.view`).
 */
export function CustomerLedgerPanel({
  ledger,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Ledger unavailable"
        message="You need report.view to open the customer ledger."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading ledger…
      </Typography>
    );
  }

  if (!ledger) {
    return (
      <EmptyState
        title="Ledger unavailable"
        description="Customer ledger data could not be loaded."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="customer-ledger-panel">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <Field label="Debit" value={formatInr(ledger.totals.debit)} />
        <Field label="Credit" value={formatInr(ledger.totals.credit)} />
      </Stack>

      {ledger.rows.length === 0 ? (
        <EmptyState
          title="No ledger entries"
          description="Posted journals for this customer will appear here."
        />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Journal</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Narration</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ledger.rows.map((entry) => (
              <TableRow key={`${entry.journalId}-${entry.accountCode}-${entry.runningBalance}`}>
                <TableCell>{formatDate(entry.journalDate)}</TableCell>
                <TableCell>{entry.journalNumber}</TableCell>
                <TableCell>
                  {entry.accountCode} {entry.accountName}
                </TableCell>
                <TableCell>{entry.narration || '—'}</TableCell>
                <TableCell align="right">{formatInr(entry.debit)}</TableCell>
                <TableCell align="right">{formatInr(entry.credit)}</TableCell>
                <TableCell align="right">
                  {formatInr(entry.runningBalance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
