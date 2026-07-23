import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import type {
  PublicVendorProjectAssignment,
  VendorLedgerQuery,
  VendorLedgerReport,
} from './types';

type Props = {
  ledger: VendorLedgerReport | undefined;
  filters: VendorLedgerQuery;
  onFiltersChange: (next: VendorLedgerQuery) => void;
  projects?: readonly PublicVendorProjectAssignment[];
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
 * Vendor payable ledger — `GET /vendors/:id/ledger`
 * (journal-backed via accounting-reports vendor-ledger).
 * Route permission is `vendor.view`; UI tab requires `payment.view` (finance).
 */
export function VendorLedgerPanel({
  ledger,
  filters,
  onFiltersChange,
  projects = [],
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  const [draft, setDraft] = useState<VendorLedgerQuery>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const projectOptions = useMemo(() => {
    const seen = new Set<string>();
    return projects.filter((row) => {
      if (seen.has(row.projectId)) return false;
      seen.add(row.projectId);
      return true;
    });
  }, [projects]);

  const applyFilters = () => {
    onFiltersChange({
      from: draft.from?.trim() || undefined,
      to: draft.to?.trim() || undefined,
      projectId: draft.projectId?.trim() || undefined,
    });
  };

  if (!canView) {
    return (
      <PermissionDenied
        title="Ledger unavailable"
        message="You need payment.view to open the vendor payable ledger."
        showHomeLink={false}
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="vendor-ledger-panel">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { sm: 'flex-end' } }}
      >
        <TextField
          size="small"
          type="date"
          label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={draft.from ?? ''}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, from: e.target.value }))
          }
        />
        <TextField
          size="small"
          type="date"
          label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={draft.to ?? ''}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, to: e.target.value }))
          }
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="vendor-ledger-project-label">Project</InputLabel>
          <Select
            labelId="vendor-ledger-project-label"
            label="Project"
            value={draft.projectId ?? ''}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, projectId: e.target.value }))
            }
          >
            <MenuItem value="">
              <em>All projects</em>
            </MenuItem>
            {projectOptions.map((row) => (
              <MenuItem key={row.projectId} value={row.projectId}>
                {row.projectId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          size="small"
          onClick={applyFilters}
          data-testid="vendor-ledger-apply"
        >
          Apply filters
        </Button>
      </Stack>

      {error ? <RetryPanel error={error} onRetry={onRetry} forceRetry /> : null}

      {!error && loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading ledger…
        </Typography>
      ) : null}

      {!error && !loading && !ledger ? (
        <EmptyState
          title="Ledger unavailable"
          description="Vendor ledger data could not be loaded."
        />
      ) : null}

      {!error && !loading && ledger ? (
        <>
          {ledger.reconciliationNotes?.length ? (
            <Alert severity="warning" variant="outlined">
              {ledger.reconciliationNotes.join(' · ')}
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

          {ledger.rows.length === 0 ? (
            <EmptyState
              title="No ledger entries"
              description="Posted journals for this vendor will appear here. Try widening the date or project filters."
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
                  <TableRow
                    key={`${entry.journalId}-${entry.accountCode}-${entry.runningBalance}-${entry.debit}-${entry.credit}`}
                  >
                    <TableCell>{formatDate(entry.journalDate)}</TableCell>
                    <TableCell>{entry.journalNumber}</TableCell>
                    <TableCell>
                      {entry.accountCode} {entry.accountName}
                    </TableCell>
                    <TableCell>
                      {entry.narration || entry.description || '—'}
                    </TableCell>
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
        </>
      ) : null}
    </Stack>
  );
}
