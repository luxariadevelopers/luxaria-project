import { Alert, Stack, Typography } from '@mui/material';
import { DetailHeader } from '@/components/entity-detail';
import { formatDate, formatInr } from '@/format';
import { isJournalBalanced } from './balance';
import { isJournalImmutable } from './immutableState';
import { JournalSourceCell } from './JournalSourceCell';
import { JournalStatusChip } from './JournalStatusChip';
import type { PublicJournalEntry } from './types';

type Props = {
  journal: PublicJournalEntry;
};

export function JournalHeader({ journal }: Props) {
  const immutable = isJournalImmutable(journal.status);
  const balanced = isJournalBalanced(
    journal.totalDebit,
    journal.totalCredit,
  );

  return (
    <Stack spacing={1.5} data-testid="journal-header">
      <DetailHeader
        title={journal.journalNumber}
        code={formatDate(journal.journalDate)}
        subtitle={journal.narration}
        backTo="/accounting/journals"
        backLabel="Journals"
        meta={<JournalStatusChip status={journal.status} />}
      />

      {immutable ? (
        <Alert severity="info" variant="outlined">
          This journal is read-only. Posted history cannot be edited — use
          reverse to create a correcting entry.
        </Alert>
      ) : null}

      {!balanced ? (
        <Alert severity="error" variant="outlined">
          Debit ({formatInr(journal.totalDebit)}) does not equal credit (
          {formatInr(journal.totalCredit)}). Nest should reject posting until
          balanced.
        </Alert>
      ) : null}

      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Source
        </Typography>
        <JournalSourceCell row={journal} />
      </Stack>
    </Stack>
  );
}
