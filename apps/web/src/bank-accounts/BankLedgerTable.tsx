import { Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import type { BankLedgerLine } from './types';

type Props = {
  rows: readonly BankLedgerLine[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  projectLabel: (projectId: string | null) => string;
  onOpenJournal?: (journalId: string) => void;
};

export function BankLedgerTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  projectLabel,
  onOpenJournal,
}: Props) {
  const columns: GridColDef<BankLedgerLine>[] = [
    {
      field: 'journalDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.journalDate),
    },
    {
      field: 'journalNumber',
      headerName: 'Journal',
      width: 140,
    },
    {
      field: 'narration',
      headerName: 'Narration',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (_v, row) => row.narration || '—',
    },
    {
      field: 'description',
      headerName: 'Line note',
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) => row.description || '—',
    },
    {
      field: 'projectId',
      headerName: 'Project',
      width: 140,
      valueGetter: (_v, row) => projectLabel(row.projectId),
    },
    {
      field: 'debit',
      headerName: 'Debit',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.debit),
    },
    {
      field: 'credit',
      headerName: 'Credit',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.credit),
    },
    {
      field: 'runningBalance',
      headerName: 'Running',
      width: 130,
      valueGetter: (_v, row) =>
        row.runningBalance != null ? formatInr(row.runningBalance) : '—',
    },
  ];

  return (
    <Stack data-testid="bank-ledger-table">
      <DataTable<BankLedgerLine>
        title="Transaction ledger"
        rows={[...rows]}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={onRetry}
        getRowId={(row) => row.lineId}
        onRowClick={
          onOpenJournal
            ? (params) => onOpenJournal(params.row.journalId)
            : undefined
        }
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        rowCount={rowCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        preferencesKey="bank-account-ledger"
        emptyTitle="No ledger lines"
        emptyDescription="Posted journal lines for this bank ledger appear here."
        height={420}
      />
    </Stack>
  );
}
