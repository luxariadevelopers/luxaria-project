import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatInr } from '@/format';
import { CashAccountStatusChip } from './CashAccountStatusChip';
import { cashAccountKindLabel } from './labels';
import type { CashAccountCapabilities } from './roleAccess';
import type { CashBalanceView, PublicCashAccount } from './types';
import { resolveCashAccountRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicCashAccount[];
  balancesById?: ReadonlyMap<string, CashBalanceView>;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
  caps: CashAccountCapabilities;
  currentUserId?: string | null;
  custodianLabel: (userId: string) => string;
  onTransfer?: (row: PublicCashAccount) => void;
  onConfirmHandover?: (row: PublicCashAccount) => void;
  onCancelHandover?: (row: PublicCashAccount) => void;
  onClose?: (row: PublicCashAccount) => void;
};

export function CashAccountTable({
  rows,
  balancesById,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  filterSlot,
  toolbarActions,
  caps,
  currentUserId,
  custodianLabel,
  onTransfer,
  onConfirmHandover,
  onCancelHandover,
  onClose,
}: Props) {
  const columns: GridColDef<PublicCashAccount>[] = [
    {
      field: 'accountCode',
      headerName: 'Code',
      width: 120,
    },
    {
      field: 'accountName',
      headerName: 'Account',
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'kind',
      headerName: 'Kind',
      width: 120,
      valueGetter: (_v, row) => cashAccountKindLabel(row.kind),
    },
    {
      field: 'custodianUserId',
      headerName: 'Custodian',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => custodianLabel(row.custodianUserId),
    },
    {
      field: 'currentBalance',
      headerName: 'Balance',
      width: 130,
      valueGetter: (_v, row) => {
        const bal = balancesById?.get(row.id);
        return bal ? formatInr(bal.currentBalance) : '—';
      },
    },
    {
      field: 'maximumHoldingLimit',
      headerName: 'Max hold',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.maximumHoldingLimit),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <CashAccountStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicCashAccount>[] = [];

  if (onTransfer && caps.canManage) {
    rowActions.push({
      id: 'transfer',
      label: 'Transfer custodian',
      onClick: onTransfer,
      disabled: (row) =>
        !resolveCashAccountRowActions(row, caps, currentUserId).includes(
          'transfer',
        ),
    });
  }
  if (onConfirmHandover && caps.canConfirmHandover) {
    rowActions.push({
      id: 'confirm_handover',
      label: 'Confirm handover',
      onClick: onConfirmHandover,
      disabled: (row) =>
        !resolveCashAccountRowActions(row, caps, currentUserId).includes(
          'confirm_handover',
        ),
    });
  }
  if (onCancelHandover && caps.canManage) {
    rowActions.push({
      id: 'cancel_handover',
      label: 'Cancel handover',
      onClick: onCancelHandover,
      disabled: (row) =>
        !resolveCashAccountRowActions(row, caps, currentUserId).includes(
          'cancel_handover',
        ),
    });
  }
  if (onClose && caps.canManage) {
    rowActions.push({
      id: 'close',
      label: 'Close',
      danger: true,
      onClick: onClose,
      disabled: (row) =>
        !resolveCashAccountRowActions(row, caps, currentUserId).includes(
          'close',
        ),
    });
  }

  return (
    <DataTable
      title="Cash & petty cash"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No cash accounts"
      emptyDescription="Create a site cash or petty-cash float for this project, or adjust filters."
      height={520}
      getRowId={(row) => row.id}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search code or name…"
      preferencesKey="cash-accounts-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
