import {
  Alert,
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
import type { VendorLedgerPlaceholder } from './types';

type Props = {
  ledger: VendorLedgerPlaceholder | undefined;
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
 * Vendor payable ledger — Nest placeholder (`GET /vendors/:id/ledger`).
 * Route permission is `vendor.view`; UI tab requires `payment.view` (finance).
 */
export function VendorLedgerPanel({
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
        message="You need payment.view to open the vendor payable ledger."
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
        description="Vendor ledger data could not be loaded."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="vendor-ledger-panel">
      {ledger.note ? (
        <Alert severity="info" variant="outlined">
          {ledger.note}
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <Field label="Opening" value={formatInr(ledger.openingBalance)} />
        <Field label="Debit" value={formatInr(ledger.totalDebit)} />
        <Field label="Credit" value={formatInr(ledger.totalCredit)} />
        <Field label="Closing" value={formatInr(ledger.closingBalance)} />
        <Field
          label="As of"
          value={ledger.asOf ? formatDate(ledger.asOf) : '—'}
        />
      </Stack>

      {ledger.entries.length === 0 ? (
        <EmptyState
          title="No ledger entries"
          description="Payable postings will appear here when the ledger is wired beyond the placeholder."
        />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ledger.entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDate(entry.entryDate)}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell align="right">{formatInr(entry.debit)}</TableCell>
                <TableCell align="right">{formatInr(entry.credit)}</TableCell>
                <TableCell align="right">{formatInr(entry.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
