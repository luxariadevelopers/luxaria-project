import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { Stack, Typography } from '@mui/material';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import type { PublicBankStatementLine, PublicBookLine } from './types';

type Props = {
  statementLines: readonly PublicBankStatementLine[];
  bookLines: readonly PublicBookLine[];
  loading?: boolean;
  statementSelection: GridRowSelectionModel;
  bookSelection: GridRowSelectionModel;
  onStatementSelectionChange: (model: GridRowSelectionModel) => void;
  onBookSelectionChange: (model: GridRowSelectionModel) => void;
  selectable?: boolean;
};

function bookKey(row: PublicBookLine): string {
  return `${row.journalId}:${row.journalLineId}`;
}

export function UnmatchedPanels({
  statementLines,
  bookLines,
  loading,
  statementSelection,
  bookSelection,
  onStatementSelectionChange,
  onBookSelectionChange,
  selectable = true,
}: Props) {
  const statementColumns: GridColDef<PublicBankStatementLine>[] = [
    { field: 'lineNumber', headerName: '#', width: 70 },
    {
      field: 'txnDate',
      headerName: 'Date',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.txnDate),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'debit',
      headerName: 'Debit',
      width: 110,
      valueGetter: (_v, row) => formatInr(row.debit),
    },
    {
      field: 'credit',
      headerName: 'Credit',
      width: 110,
      valueGetter: (_v, row) => formatInr(row.credit),
    },
    {
      field: 'transactionId',
      headerName: 'Txn / UTR',
      width: 130,
      valueGetter: (_v, row) => row.transactionId ?? '—',
    },
  ];

  const bookColumns: GridColDef<PublicBookLine>[] = [
    { field: 'journalNumber', headerName: 'Journal', width: 120 },
    {
      field: 'journalDate',
      headerName: 'Date',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.journalDate),
    },
    {
      field: 'narration',
      headerName: 'Narration',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.lineDescription || row.narration || '—',
    },
    {
      field: 'debit',
      headerName: 'Debit',
      width: 110,
      valueGetter: (_v, row) => formatInr(row.debit),
    },
    {
      field: 'credit',
      headerName: 'Credit',
      width: 110,
      valueGetter: (_v, row) => formatInr(row.credit),
    },
  ];

  return (
    <Stack spacing={2} data-testid="bank-recon-unmatched-panels">
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">
          Unmatched statement lines ({statementLines.length})
        </Typography>
        <DataTable
          rows={[...statementLines]}
          columns={statementColumns}
          getRowId={(row) => row.id}
          loading={loading}
          height={280}
          emptyTitle="No unmatched statement lines"
          emptyDescription="All imported lines are matched, or import a statement first."
          checkboxSelection={selectable}
          rowSelectionModel={statementSelection}
          onRowSelectionModelChange={onStatementSelectionChange}
          showColumnVisibility={false}
          paginationMode="client"
        />
      </Stack>

      <Stack spacing={0.5}>
        <Typography variant="subtitle2">
          Unmatched book lines ({bookLines.length})
        </Typography>
        <DataTable
          rows={[...bookLines]}
          columns={bookColumns}
          getRowId={(row) => bookKey(row)}
          loading={loading}
          height={280}
          emptyTitle="No unmatched book lines"
          emptyDescription="No posted journal lines remain unmatched for this bank ledger in the statement period."
          checkboxSelection={selectable}
          rowSelectionModel={bookSelection}
          onRowSelectionModelChange={onBookSelectionChange}
          showColumnVisibility={false}
          paginationMode="client"
        />
      </Stack>
    </Stack>
  );
}

export { bookKey };
