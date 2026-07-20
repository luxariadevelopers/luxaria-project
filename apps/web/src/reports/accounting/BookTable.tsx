import { Link as RouterLink } from 'react-router-dom';
import { Link, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatOptionalMoney } from '@/director-command-centre/formatMetric';
import { formatDate } from '@/format';
import { resolveBookTransactionLink } from './transactionLinks';
import type { LedgerLineRow } from './types';

type Props = {
  rows: readonly LedgerLineRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
};

export function BookTable({ rows, loading, error, onRetry }: Props) {
  const columns: GridColDef<LedgerLineRow>[] = [
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
      renderCell: (params) => {
        const link = resolveBookTransactionLink(params.row);
        if (!link) {
          return (
            <Typography variant="body2" noWrap>
              {params.row.journalNumber || '—'}
            </Typography>
          );
        }
        return (
          <Link
            component={RouterLink}
            to={link.to}
            underline="hover"
            variant="body2"
            noWrap
          >
            {params.row.journalNumber || link.label}
          </Link>
        );
      },
    },
    {
      field: 'accountCode',
      headerName: 'Account',
      width: 200,
      valueGetter: (_v, row) =>
        row.accountCode
          ? `${row.accountCode} · ${row.accountName}`
          : row.accountName || '—',
    },
    {
      field: 'narration',
      headerName: 'Narration',
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) => row.description || row.narration || '—',
    },
    {
      field: 'debit',
      headerName: 'Debit',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_v, row) => formatOptionalMoney(row.debit),
    },
    {
      field: 'credit',
      headerName: 'Credit',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_v, row) => formatOptionalMoney(row.credit),
    },
    {
      field: 'runningBalance',
      headerName: 'Running balance',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_v, row) => formatOptionalMoney(row.runningBalance),
    },
  ];

  return (
    <DataTable
      rows={[...rows]}
      columns={columns}
      getRowId={(row) =>
        `${row.journalId}-${row.accountId}-${row.journalDate}-${row.debit}-${row.credit}-${row.runningBalance}`
      }
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No movements"
      emptyDescription="No cash/bank postings match the selected filters."
      paginationMode="client"
      height={520}
      preferencesKey="accounting-cash-bank-book"
    />
  );
}
