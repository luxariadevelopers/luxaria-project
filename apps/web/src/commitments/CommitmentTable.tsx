import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { CommitmentStatusChip } from './CommitmentStatusChip';
import { contributionTypeLabel } from './labels';
import type { CommitmentCapabilities } from './roleAccess';
import type { PublicCommitment } from './types';
import { resolveCommitmentRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicCommitment[];
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
  caps: CommitmentCapabilities;
  participantLabel: (participantId: string) => string;
  onSubmit?: (row: PublicCommitment) => void;
  onApprove?: (row: PublicCommitment) => void;
  onAmend?: (row: PublicCommitment) => void;
  onCancel?: (row: PublicCommitment) => void;
  /** Deep link to commitment detail. */
  onOpenDetail?: (row: PublicCommitment) => void;
};

export function CommitmentTable({
  rows,
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
  participantLabel,
  onSubmit,
  onApprove,
  onAmend,
  onCancel,
  onOpenDetail,
}: Props) {
  const columns: GridColDef<PublicCommitment>[] = [
    {
      field: 'commitmentNumber',
      headerName: 'Number',
      width: 140,
    },
    {
      field: 'version',
      headerName: 'Ver',
      width: 70,
      type: 'number',
    },
    {
      field: 'participantId',
      headerName: 'Participant',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => participantLabel(row.participantId),
    },
    {
      field: 'contributionType',
      headerName: 'Type',
      width: 130,
      valueGetter: (_v, row) => contributionTypeLabel(row.contributionType),
    },
    {
      field: 'commitmentAmount',
      headerName: 'Committed',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.commitmentAmount),
    },
    {
      field: 'receivedAmount',
      headerName: 'Received',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.receivedAmount),
    },
    {
      field: 'pendingAmount',
      headerName: 'Pending',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.pendingAmount),
    },
    {
      field: 'commitmentDate',
      headerName: 'Committed on',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.commitmentDate),
    },
    {
      field: 'dueDate',
      headerName: 'Due',
      width: 120,
      valueGetter: (_v, row) =>
        row.dueDate ? formatDate(row.dueDate) : '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <CommitmentStatusChip status={params.row.status} row={params.row} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicCommitment>[] = [];

  if (onOpenDetail) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpenDetail,
    });
  }

  if (onSubmit && caps.canSubmit) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveCommitmentRowActions(row, caps).includes('submit'),
    });
  }
  if (onApprove && caps.canApprove) {
    rowActions.push({
      id: 'approve',
      label: 'Approve',
      onClick: onApprove,
      disabled: (row) =>
        !resolveCommitmentRowActions(row, caps).includes('approve'),
    });
  }
  if (onAmend && caps.canAmend) {
    rowActions.push({
      id: 'amend',
      label: 'Amend',
      onClick: onAmend,
      disabled: (row) =>
        !resolveCommitmentRowActions(row, caps).includes('amend'),
    });
  }
  if (onCancel && caps.canCancel) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      danger: true,
      onClick: onCancel,
      disabled: (row) =>
        !resolveCommitmentRowActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Commitments"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No commitments"
      emptyDescription="Create a funding commitment or adjust filters."
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
      searchPlaceholder="Search number…"
      preferencesKey="commitments-list"
      mobileCard={{
        primaryField: 'commitmentNumber',
        metaFields: ['commitmentAmount', 'pendingAmount'],
        statusField: 'status',
      }}
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={
        onOpenDetail
          ? (params) => onOpenDetail(params.row)
          : undefined
      }
    />
  );
}
