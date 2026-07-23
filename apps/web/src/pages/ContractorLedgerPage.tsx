import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { fetchContractorLedger } from '@/contractor-ledger/api';

function money(n: unknown): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Contractor ledger — immutable journal party ledger UI.
 * Nest: `GET /contractor-ledger` (wraps accounting-reports contractor-ledger)
 *   or `GET /accounting-reports/contractor-ledger`
 * Permission: `report.view`
 */
export function ContractorLedgerPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('report.view');
  const [partyId, setPartyId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useQuery({
    queryKey: [
      'contractor-ledger',
      selectedProjectId,
      partyId,
      from,
      to,
    ],
    queryFn: () =>
      fetchContractorLedger({
        projectId: selectedProjectId!,
        partyId: partyId.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view the contractor ledger.</Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const payload = query.data;
  const rows = (payload?.rows ?? []) as Array<Record<string, unknown>>;

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h5">Contractor Ledger</Typography>
        <Typography variant="body2" color="text.secondary">
          Immutable sub-ledger from posted journals (party type contractor).
          Source: accounting-reports contractor-ledger.
        </Typography>
      </div>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          size="small"
          label="Contractor id (party)"
          value={partyId}
          onChange={(e) => setPartyId(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          size="small"
          type="date"
          label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </Stack>

      {payload?.meta ? (
        <Typography variant="caption" color="text.secondary">
          {payload.meta.title}
          {payload.meta.generatedAt
            ? ` · generated ${String(payload.meta.generatedAt)}`
            : ''}
        </Typography>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Journal</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Party</TableCell>
              <TableCell>Narration</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No ledger lines for this project / filter.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={String(row.journalId ?? idx) + String(row.accountId ?? '')}
                >
                  <TableCell>{String(row.journalDate ?? '—')}</TableCell>
                  <TableCell>{String(row.journalNumber ?? '—')}</TableCell>
                  <TableCell>
                    {[row.accountCode, row.accountName]
                      .filter(Boolean)
                      .join(' — ') || '—'}
                  </TableCell>
                  <TableCell>
                    {String(
                      (row as { partyName?: string | null }).partyName ??
                        row.partyId ??
                        '—',
                    )}
                  </TableCell>
                  <TableCell>
                    {String(row.narration || row.description || '—')}
                  </TableCell>
                  <TableCell align="right">{money(row.debit)}</TableCell>
                  <TableCell align="right">{money(row.credit)}</TableCell>
                  <TableCell align="right">
                    {money(row.runningBalance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
