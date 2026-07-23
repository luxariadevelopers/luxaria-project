import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatMaskedAadhaarReference } from './aadhaarMasking';
import { KycStatusChip } from './KycStatusChip';
import {
  customerStatusLabel,
  customerUiState,
  fundingTypeLabel,
} from './kycState';
import type { CustomerListRow } from './types';
import { CustomerStatus } from './types';

type Props = {
  rows: readonly CustomerListRow[];
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
  onVerifyKyc?: (row: CustomerListRow, verified: boolean) => void;
  onActivate?: (row: CustomerListRow) => void;
  onDeactivate?: (row: CustomerListRow) => void;
  onEdit?: (row: CustomerListRow) => void;
};

export function CustomerTable({
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

  const columns: GridColDef<CustomerListRow>[] = [
    { field: 'customerCode', headerName: 'Code', width: 120 },
    { field: 'fullName', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'pan',
      headerName: 'PAN',
      width: 120,
      valueGetter: (_v, row) => row.pan ?? '—',
    },
    {
      field: 'aadhaarReference',
      headerName: 'Aadhaar',
      width: 150,
      valueGetter: (_v, row) =>
        formatMaskedAadhaarReference(row.aadhaarReference),
    },
    {
      field: 'fundingType',
      headerName: 'Funding',
      width: 130,
      valueGetter: (_v, row) => fundingTypeLabel(row.fundingType),
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
        const blocked = params.row.status === CustomerStatus.Inactive;
        return (
          <Chip
            size="small"
            label={customerStatusLabel(params.row.status)}
            color={
              params.row.status === CustomerStatus.Active
                ? 'success'
                : blocked
                  ? 'default'
                  : 'warning'
            }
            variant={blocked ? 'filled' : 'outlined'}
            data-testid="customer-status-chip"
            data-blocked={blocked ? 'true' : 'false'}
          />
        );
      },
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 130,
      valueGetter: (_v, row) => row.phone ?? '—',
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.email ?? '—',
    },
  ];

  const rowActions: DataTableRowAction<CustomerListRow>[] = [
    {
      id: 'open',
      label: 'Open',
      onClick: (row) => {
        void navigate(`/sales/customers/${row.id}`);
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
        disabled: (row) => !customerUiState(row).canReviewKyc,
      },
      {
        id: 'reject-kyc',
        label: 'Reject KYC',
        danger: true,
        onClick: (row) => onVerifyKyc(row, false),
        disabled: (row) => !customerUiState(row).canReviewKyc,
      },
    );
  }

  if (canActivate && onActivate && onDeactivate) {
    rowActions.push(
      {
        id: 'activate',
        label: 'Activate',
        onClick: onActivate,
        disabled: (row) => !customerUiState(row).canActivate,
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        danger: true,
        onClick: onDeactivate,
        disabled: (row) => !customerUiState(row).canDeactivate,
      },
    );
  }

  return (
    <DataTable
      title="Customers"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No customers"
      emptyDescription="Create a customer or adjust filters."
      height={520}
      getRowId={(row) => row.id}
      onRowClick={(params) => {
        void navigate(`/sales/customers/${params.row.id}`);
      }}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search name, code, PAN, phone…"
      preferencesKey="customers-list"
      mobileCard={{
        primaryField: 'fullName',
        metaFields: ['customerCode', 'phone'],
        statusField: 'status',
      }}
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
