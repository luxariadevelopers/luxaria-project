import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { SessionStatusChip } from './SessionStatusChip';
import type { PublicBankReconciliationSession } from './types';

type Props = {
  rows: readonly PublicBankReconciliationSession[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  bankLabel: (bankAccountId: string) => string;
  onOpen: (row: PublicBankReconciliationSession) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
};

export function SessionTable({
  rows,
  loading,
  error,
  onRetry,
  bankLabel,
  onOpen,
  filterSlot,
  toolbarActions,
}: Props) {
  const columns: GridColDef<PublicBankReconciliationSession>[] = [
    { field: 'sessionNumber', headerName: 'Session', width: 140 },
    {
      field: 'bankAccountId',
      headerName: 'Bank account',
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) => bankLabel(row.bankAccountId),
    },
    {
      field: 'statementFrom',
      headerName: 'From',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.statementFrom),
    },
    {
      field: 'statementTo',
      headerName: 'To',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.statementTo),
    },
    {
      field: 'statementClosingBalance',
      headerName: 'Closing',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.statementClosingBalance),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => <SessionStatusChip status={params.row.status} />,
    },
  ];

  return (
    <DataTable
      title="Bank reconciliation"
      rows={[...rows]}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      paginationMode="client"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      onRowClick={(params) => onOpen(params.row)}
      emptyTitle="No reconciliation sessions"
      emptyDescription="Create a session for a bank account and import the statement to begin matching."
      preferencesKey="bank-reconciliation-sessions"
      height={520}
    />
  );
}
