import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatInr } from '@/format';
import { BankAccountStatusChip } from './BankAccountStatusChip';
import { bankAccountTypeLabel } from './labels';
import { formatMaskedAccountNumber } from './masking';
import type { PublicCompanyBankAccount } from './types';

type Props = {
  rows: readonly PublicCompanyBankAccount[];
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
  onOpen?: (row: PublicCompanyBankAccount) => void;
};

/**
 * List table — always shows Nest `maskedAccountNumber`.
 * Never renders full `accountNumber` (stripped before display).
 */
export function MaskedAccountTable({
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
  onOpen,
}: Props) {
  const columns: GridColDef<PublicCompanyBankAccount>[] = [
    {
      field: 'accountCode',
      headerName: 'Code',
      width: 120,
    },
    {
      field: 'bankName',
      headerName: 'Bank',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'accountHolderName',
      headerName: 'Holder',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'maskedAccountNumber',
      headerName: 'Account',
      width: 140,
      sortable: false,
      valueGetter: (_v, row) =>
        formatMaskedAccountNumber(row.maskedAccountNumber),
    },
    {
      field: 'ifsc',
      headerName: 'IFSC',
      width: 130,
    },
    {
      field: 'accountType',
      headerName: 'Type',
      width: 120,
      valueGetter: (_v, row) => bankAccountTypeLabel(row.accountType),
    },
    {
      field: 'projectId',
      headerName: 'Scope',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => projectLabel(row.projectId),
    },
    {
      field: 'openingBalance',
      headerName: 'Opening',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.openingBalance),
    },
    {
      field: 'isDefault',
      headerName: 'Default',
      width: 100,
      sortable: false,
      renderCell: (params) =>
        params.row.isDefault ? (
          <Chip size="small" color="primary" variant="outlined" label="Default" />
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <BankAccountStatusChip status={params.row.status} />
      ),
    },
  ];

  return (
    <Stack spacing={1.5} data-testid="masked-account-table">
      <DataTable<PublicCompanyBankAccount>
        title="Bank accounts"
        rows={[...rows]}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={onRetry}
        getRowId={(row) => row.id}
        onRowClick={onOpen ? (params) => onOpen(params.row) : undefined}
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        rowCount={rowCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        preferencesKey="bank-accounts-list"
        filterSlot={filterSlot}
        emptyTitle="No bank accounts"
        emptyDescription="Create a company or project bank account to get started. Account numbers stay masked."
        height={560}
      />
    </Stack>
  );
}
