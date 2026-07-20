import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import {
  formatProfitSharePercent,
  instrumentTypeLabel,
  participantTypeLabel,
} from './labels';
import { ParticipantStatusChip } from './ParticipantStatusChip';
import {
  ParticipantApprovalStatus,
  type PublicProjectParticipant,
} from './types';

type Props = {
  title?: string;
  rows: readonly PublicProjectParticipant[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarActions?: ReactNode;
  canCreateVersion?: boolean;
  canUpdateDraft?: boolean;
  onCreateVersion?: (row: PublicProjectParticipant) => void;
  onEditDraft?: (row: PublicProjectParticipant) => void;
};

export function ParticipantTable({
  title = 'Active participants',
  rows,
  loading,
  error,
  onRetry,
  emptyTitle = 'No participants',
  emptyDescription = 'No active approved funding participants for this project.',
  toolbarActions,
  canCreateVersion = false,
  canUpdateDraft = false,
  onCreateVersion,
  onEditDraft,
}: Props) {
  const columns: GridColDef<PublicProjectParticipant>[] = [
    {
      field: 'participantLabel',
      headerName: 'Participant',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) =>
        row.participantLabel?.trim() || row.participantId,
    },
    {
      field: 'participantType',
      headerName: 'Type',
      width: 150,
      valueGetter: (_v, row) => participantTypeLabel(row.participantType),
    },
    {
      field: 'commitmentAmount',
      headerName: 'Commitment',
      width: 140,
      valueFormatter: (value: number) => formatInr(value),
    },
    {
      field: 'approvedProfitSharePercentage',
      headerName: 'Profit share',
      width: 120,
      valueGetter: (_v, row) =>
        formatProfitSharePercent(row.approvedProfitSharePercentage),
    },
    {
      field: 'lossSharePercentage',
      headerName: 'Loss share',
      width: 110,
      valueGetter: (_v, row) =>
        formatProfitSharePercent(row.lossSharePercentage),
    },
    {
      field: 'instrumentType',
      headerName: 'Instrument',
      width: 150,
      valueGetter: (_v, row) => instrumentTypeLabel(row.instrumentType),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <ParticipantStatusChip status={params.row.status} />
      ),
    },
    {
      field: 'version',
      headerName: 'Ver',
      width: 70,
    },
    {
      field: 'effectiveFrom',
      headerName: 'Effective',
      width: 120,
      valueGetter: (_v, row) =>
        row.effectiveFrom ? formatDate(row.effectiveFrom) : '—',
    },
  ];

  const rowActions: DataTableRowAction<PublicProjectParticipant>[] = [];

  if (canCreateVersion && onCreateVersion) {
    rowActions.push({
      id: 'new-version',
      label: 'New version',
      onClick: onCreateVersion,
      disabled: (row) =>
        row.status !== ParticipantApprovalStatus.Approved ||
        row.effectiveTo != null,
    });
  }

  if (canUpdateDraft && onEditDraft) {
    rowActions.push({
      id: 'edit-draft',
      label: 'Edit draft',
      onClick: onEditDraft,
      disabled: (row) => row.status !== ParticipantApprovalStatus.Draft,
    });
  }

  return (
    <DataTable
      title={title}
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      getRowId={(row) => row.id}
      height={420}
      paginationMode="client"
      preferencesKey="project-participants-table"
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
