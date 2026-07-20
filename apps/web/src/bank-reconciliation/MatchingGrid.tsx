import type { GridColDef } from '@mui/x-data-grid';
import { Button, Stack, Typography } from '@mui/material';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { matchStatusLabel, matchTypeLabel } from './labels';
import type { PublicBankReconciliationMatch } from './types';
import { BankReconciliationMatchStatus } from './types';

type Props = {
  matches: readonly PublicBankReconciliationMatch[];
  loading?: boolean;
  canUnmatch?: boolean;
  onUnmatch?: (match: PublicBankReconciliationMatch) => void;
};

export function MatchingGrid({
  matches,
  loading,
  canUnmatch,
  onUnmatch,
}: Props) {
  const columns: GridColDef<PublicBankReconciliationMatch>[] = [
    {
      field: 'matchedAt',
      headerName: 'Matched',
      width: 130,
      valueGetter: (_v, row) => formatDate(row.matchedAt),
    },
    {
      field: 'matchType',
      headerName: 'Type',
      width: 100,
      valueGetter: (_v, row) => matchTypeLabel(row.matchType),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      valueGetter: (_v, row) => matchStatusLabel(row.status),
    },
    {
      field: 'statementLineIds',
      headerName: 'Stmt lines',
      width: 110,
      valueGetter: (_v, row) => String(row.statementLineIds.length),
    },
    {
      field: 'bookLines',
      headerName: 'Book',
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) =>
        row.bookLines
          .map(
            (b) =>
              `${b.journalNumber} (${formatInr(b.debit)}/${formatInr(b.credit)})`,
          )
          .join(', '),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) => row.notes ?? '—',
    },
  ];

  const rowActions: DataTableRowAction<PublicBankReconciliationMatch>[] = [];
  if (canUnmatch && onUnmatch) {
    rowActions.push({
      id: 'unmatch',
      label: 'Unmatch',
      danger: true,
      onClick: onUnmatch,
      disabled: (row) => row.status !== BankReconciliationMatchStatus.Active,
    });
  }

  return (
    <Stack spacing={1} data-testid="bank-recon-matching-grid">
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle2">
          Match history ({matches.length})
        </Typography>
        {canUnmatch ? (
          <Typography variant="caption" color="text.secondary">
            Undo keeps an audit trail (`undone` status).
          </Typography>
        ) : null}
      </Stack>
      <DataTable
        rows={[...matches]}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        height={320}
        emptyTitle="No matches yet"
        emptyDescription="Run auto-match or select unmatched lines for a manual match."
        rowActions={rowActions}
        showColumnVisibility={false}
        paginationMode="client"
      />
      {!canUnmatch && onUnmatch ? (
        <Button disabled size="small">
          Unmatch requires bank_reconciliation.match
        </Button>
      ) : null}
    </Stack>
  );
}
