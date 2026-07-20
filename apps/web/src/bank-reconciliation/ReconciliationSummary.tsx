import { Box, Chip, Stack, Typography } from '@mui/material';
import { formatDate, formatInr } from '@/format';
import type { PublicBankReconciliationSession, ReconciliationStatement } from './types';
import { SessionStatusChip } from './SessionStatusChip';

type Props = {
  session: PublicBankReconciliationSession;
  statement?: ReconciliationStatement | null;
  loading?: boolean;
};

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: '1 1 140px',
        minWidth: 140,
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: emphasize ? 'action.hover' : 'background.paper',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

export function ReconciliationSummary({ session, statement, loading }: Props) {
  return (
    <Stack spacing={1.5} data-testid="bank-recon-summary">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h6">{session.sessionNumber}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(session.statementFrom)} – {formatDate(session.statementTo)}
            {session.sourceFileName ? ` · ${session.sourceFileName}` : ''}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SessionStatusChip status={session.status} />
          {statement ? (
            <Chip
              size="small"
              color={statement.reconciled ? 'success' : 'warning'}
              label={
                statement.reconciled
                  ? 'Reconciled'
                  : `Difference ${formatInr(statement.difference)}`
              }
            />
          ) : null}
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <Stat
          label="Lines"
          value={String(session.lineCount ?? statement?.matchedCount ?? '—')}
        />
        <Stat
          label="Matched"
          value={String(session.matchedCount ?? statement?.matchedCount ?? '—')}
        />
        <Stat
          label="Unmatched (stmt)"
          value={String(
            session.unmatchedCount ?? statement?.unmatchedStatementCount ?? '—',
          )}
        />
        <Stat
          label="Statement closing"
          value={formatInr(session.statementClosingBalance)}
        />
        {statement ? (
          <>
            <Stat
              label="Adjusted bank"
              value={loading ? '…' : formatInr(statement.adjustedBankBalance)}
            />
            <Stat
              label="Adjusted book"
              value={loading ? '…' : formatInr(statement.adjustedBookBalance)}
              emphasize
            />
          </>
        ) : null}
      </Stack>
    </Stack>
  );
}
