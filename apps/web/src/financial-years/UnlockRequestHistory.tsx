import { useCallback, useMemo } from 'react';
import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/data-table';
import { formatDateTime } from '@/format';
import {
  UnlockRequestStatus,
  type PublicFinancialYearUnlockRequest,
} from './types';

type Props = {
  rows: PublicFinancialYearUnlockRequest[];
  loading: boolean;
  error?: unknown;
  page: number;
  pageSize: number;
  rowCount: number;
  status: UnlockRequestStatus | '';
  currentUserId?: string | null;
  canDecide: boolean;
  onStatusChange: (status: UnlockRequestStatus | '') => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  onApprove: (request: PublicFinancialYearUnlockRequest) => void;
  onReject: (request: PublicFinancialYearUnlockRequest) => void;
};

function statusColor(status: UnlockRequestStatus) {
  if (status === UnlockRequestStatus.Approved) return 'success' as const;
  if (status === UnlockRequestStatus.Rejected) return 'error' as const;
  return 'warning' as const;
}

export function UnlockRequestHistory({
  rows,
  loading,
  error,
  page,
  pageSize,
  rowCount,
  status,
  currentUserId,
  canDecide,
  onStatusChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onApprove,
  onReject,
}: Props) {
  const userLabel = useCallback(
    (userId: string | null) => {
      if (!userId) return '—';
      return userId === currentUserId ? 'You' : userId;
    },
    [currentUserId],
  );

  const columns = useMemo<
    GridColDef<PublicFinancialYearUnlockRequest>[]
  >(
    () => [
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            variant="outlined"
            color={statusColor(row.status)}
            label={
              row.status.charAt(0).toUpperCase() + row.status.slice(1)
            }
          />
        ),
      },
      {
        field: 'reason',
        headerName: 'Reason',
        minWidth: 240,
        flex: 1,
      },
      {
        field: 'requestedBy',
        headerName: 'Requested by',
        minWidth: 170,
        valueFormatter: (value: string) => userLabel(value),
      },
      {
        field: 'createdAt',
        headerName: 'Requested',
        width: 170,
        valueFormatter: (value: string | undefined) =>
          value ? formatDateTime(value) : '—',
      },
      {
        field: 'decisionBy',
        headerName: 'Decided by',
        minWidth: 170,
        valueGetter: (_value, row) => row.approvedBy ?? row.rejectedBy,
        valueFormatter: (value: string | null) => userLabel(value),
      },
      {
        field: 'decisionNote',
        headerName: 'Decision note',
        minWidth: 220,
        flex: 1,
        valueGetter: (_value, row) =>
          row.approvalNote ?? row.rejectionReason ?? '—',
      },
    ],
    [userLabel],
  );

  const filter = (
    <FormControl size="small" sx={{ minWidth: 170 }}>
      <InputLabel id="unlock-request-status-filter">Status</InputLabel>
      <Select
        labelId="unlock-request-status-filter"
        label="Status"
        value={status}
        onChange={(event) =>
          onStatusChange(
            event.target.value as UnlockRequestStatus | '',
          )
        }
      >
        <MenuItem value="">All statuses</MenuItem>
        <MenuItem value={UnlockRequestStatus.Pending}>Pending</MenuItem>
        <MenuItem value={UnlockRequestStatus.Approved}>Approved</MenuItem>
        <MenuItem value={UnlockRequestStatus.Rejected}>Rejected</MenuItem>
      </Select>
    </FormControl>
  );

  return (
    <DataTable<PublicFinancialYearUnlockRequest>
      title="Unlock request history"
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No unlock requests"
      emptyDescription="No unlock request has been recorded for this financial year."
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      filterSlot={filter}
      getRowId={(row) => row.id}
      rowActions={
        canDecide
          ? (row) => {
              if (row.status !== UnlockRequestStatus.Pending) return [];
              return [
                ...(row.requestedBy !== currentUserId
                  ? [
                      {
                        id: 'approve',
                        label: 'Approve and unlock',
                        permission: 'financial_year.unlock',
                        onClick: onApprove,
                      },
                    ]
                  : []),
                {
                  id: 'reject',
                  label: 'Reject request',
                  permission: 'financial_year.unlock',
                  danger: true,
                  onClick: onReject,
                },
              ];
            }
          : undefined
      }
      height={380}
      showColumnVisibility={false}
    />
  );
}
