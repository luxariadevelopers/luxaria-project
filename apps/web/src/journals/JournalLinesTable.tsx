import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import { isJournalBalanced } from './balance';
import type { PublicJournalEntry, PublicJournalLine } from './types';

type Props = {
  journal: PublicJournalEntry;
  accountLabel?: (accountId: string) => string;
};

function LineRow({
  line,
  accountLabel,
}: {
  line: PublicJournalLine;
  accountLabel?: (accountId: string) => string;
}) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography
          variant="body2"
          sx={{ fontFamily: 'ui-monospace, monospace' }}
        >
          {accountLabel?.(line.accountId) ?? line.accountId}
        </Typography>
      </TableCell>
      <TableCell align="right">
        {line.debit > 0 ? formatInr(line.debit) : '—'}
      </TableCell>
      <TableCell align="right">
        {line.credit > 0 ? formatInr(line.credit) : '—'}
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary" noWrap>
          {line.description?.trim() || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption" color="text.secondary" noWrap>
          {[line.partyType, line.partyId?.slice(-6)].filter(Boolean).join(' · ') ||
            '—'}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

export function JournalLinesTable({ journal, accountLabel }: Props) {
  const balanced = isJournalBalanced(
    journal.totalDebit,
    journal.totalCredit,
  );

  return (
    <Paper
      variant="outlined"
      sx={{ overflow: 'auto' }}
      data-testid="journal-lines-table"
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Account</TableCell>
            <TableCell align="right">Debit</TableCell>
            <TableCell align="right">Credit</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Party</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {journal.lines.map((line) => (
            <LineRow
              key={line.id || `${line.accountId}-${line.debit}-${line.credit}`}
              line={line}
              accountLabel={accountLabel}
            />
          ))}
          <TableRow>
            <TableCell>
              <Typography variant="subtitle2">Totals</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle2">
                {formatInr(journal.totalDebit)}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle2">
                {formatInr(journal.totalCredit)}
              </Typography>
            </TableCell>
            <TableCell colSpan={2}>
              <Typography
                variant="caption"
                color={balanced ? 'success.main' : 'error.main'}
              >
                {balanced ? 'Balanced' : 'Out of balance'}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
}
