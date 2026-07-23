import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { isJournalBalanced } from './balance';
import { JournalSourceCell } from './JournalSourceCell';
import { JournalStatusChip } from './JournalStatusChip';
import type { PublicJournalEntry } from './types';

type Props = {
  rows: readonly PublicJournalEntry[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
  projectLabel: (projectId: string | null) => string;
  fyLabel: (financialYearId: string) => string;
  onOpen?: (row: PublicJournalEntry) => void;
};

export function JournalTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  filterSlot,
  projectLabel,
  fyLabel,
  onOpen,
}: Props) {
  const columns: GridColDef<PublicJournalEntry>[] = [
    {
      field: 'journalNumber',
      headerName: 'Number',
      width: 150,
    },
    {
      field: 'journalDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.journalDate),
    },
    {
      field: 'financialYearId',
      headerName: 'FY',
      width: 130,
      valueGetter: (_v, row) => fyLabel(row.financialYearId),
    },
    {
      field: 'projectId',
      headerName: 'Project',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => projectLabel(row.projectId),
    },
    {
      field: 'sourceModule',
      headerName: 'Source',
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (params) => <JournalSourceCell row={params.row} />,
    },
    {
      field: 'narration',
      headerName: 'Narration',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (_v, row) => row.narration || '—',
    },
    {
      field: 'totalDebit',
      headerName: 'Debit',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.totalDebit),
    },
    {
      field: 'totalCredit',
      headerName: 'Credit',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.totalCredit),
    },
    {
      field: 'balance',
      headerName: 'Balance',
      width: 110,
      sortable: false,
      renderCell: (params) => {
        const ok = isJournalBalanced(
          params.row.totalDebit,
          params.row.totalCredit,
        );
        return (
          <Chip
            size="small"
            color={ok ? 'success' : 'error'}
            variant="outlined"
            label={ok ? 'OK' : 'Unequal'}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <JournalStatusChip status={params.row.status} />
      ),
    },
  ];

  return (
    <DataTable
      title="Journals"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No journals"
      emptyDescription="Adjust financial year, project, source, status, or date range filters. Nest list has no free-text search."
      height={560}
      getRowId={(row) => row.id}
      onRowClick={
        onOpen ? (params) => onOpen(params.row) : undefined
      }
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      preferencesKey="journals-list"
      mobileCard={{
        primaryField: 'journalNumber',
        metaFields: ['journalDate', 'totalDebit'],
        statusField: 'status',
      }}
      filterSlot={
        <Stack spacing={1}>
          {filterSlot}
          <Typography variant="caption" color="text.secondary">
            Filters map to Nest `GET /journals` (status, project, FY, source,
            from/to). Debit and credit must match on every journal.
          </Typography>
        </Stack>
      }
    />
  );
}
