import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { KycStatusChip } from './KycStatusChip';
import {
  investorStatusLabel,
  investorTypeLabel,
  investorUiState,
} from './kycState';
import type { InvestorListRow } from './types';
import { InvestorStatus } from './types';

type Props = {
  rows: readonly InvestorListRow[];
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
  canVerifyKyc?: boolean;
  canActivate?: boolean;
  canUpdate?: boolean;
  onVerifyKyc?: (row: InvestorListRow, verified: boolean) => void;
  onActivate?: (row: InvestorListRow) => void;
  onDeactivate?: (row: InvestorListRow) => void;
  onEdit?: (row: InvestorListRow) => void;
};

export function InvestorTable({
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
  canVerifyKyc = false,
  canActivate = false,
  canUpdate = false,
  onVerifyKyc,
  onActivate,
  onDeactivate,
  onEdit,
}: Props) {
  const navigate = useNavigate();

  const columns: GridColDef<InvestorListRow>[] = [
    { field: 'investorCode', headerName: 'Code', width: 120 },
    { field: 'legalName', headerName: 'Legal name', flex: 1, minWidth: 180 },
    {
      field: 'investorType',
      headerName: 'Type',
      width: 150,
      valueGetter: (_v, row) => investorTypeLabel(row.investorType),
    },
    {
      field: 'pan',
      headerName: 'PAN',
      width: 120,
      valueGetter: (_v, row) => row.pan ?? '—',
    },
    {
      field: 'gstin',
      headerName: 'GSTIN',
      width: 160,
      valueGetter: (_v, row) => row.gstin ?? '—',
    },
    {
      field: 'kycStatus',
      headerName: 'KYC',
      width: 140,
      renderCell: (params) => <KycStatusChip status={params.row.kycStatus} />,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const blocked = params.row.status === InvestorStatus.Inactive;
        return (
          <Chip
            size="small"
            label={investorStatusLabel(params.row.status)}
            color={
              params.row.status === InvestorStatus.Active
                ? 'success'
                : blocked
                  ? 'default'
                  : 'warning'
            }
            variant={blocked ? 'filled' : 'outlined'}
            data-testid="investor-status-chip"
            data-blocked={blocked ? 'true' : 'false'}
          />
        );
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.email ?? '—',
    },
  ];

  const rowActions: DataTableRowAction<InvestorListRow>[] = [
    {
      id: 'open',
      label: 'Open',
      onClick: (row) => {
        void navigate(`/capital/investors/${row.id}`);
      },
    },
  ];

  if (canUpdate && onEdit) {
    rowActions.push({
      id: 'edit',
      label: 'Edit',
      onClick: onEdit,
    });
  }

  if (canVerifyKyc && onVerifyKyc) {
    rowActions.push(
      {
        id: 'verify-kyc',
        label: 'Verify KYC',
        onClick: (row) => onVerifyKyc(row, true),
        disabled: (row) => !investorUiState(row).canReviewKyc,
      },
      {
        id: 'reject-kyc',
        label: 'Reject KYC',
        danger: true,
        onClick: (row) => onVerifyKyc(row, false),
        disabled: (row) => !investorUiState(row).canReviewKyc,
      },
    );
  }

  if (canActivate && onActivate && onDeactivate) {
    rowActions.push(
      {
        id: 'activate',
        label: 'Activate',
        onClick: onActivate,
        disabled: (row) => !investorUiState(row).canActivate,
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        danger: true,
        onClick: onDeactivate,
        disabled: (row) => !investorUiState(row).canDeactivate,
      },
    );
  }

  return (
    <DataTable
      title="Investors"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No investors"
      emptyDescription="Create an investor or adjust filters."
      height={520}
      getRowId={(row) => row.id}
      onRowClick={(params) => {
        void navigate(`/capital/investors/${params.row.id}`);
      }}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search name, code, PAN…"
      preferencesKey="investors-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
