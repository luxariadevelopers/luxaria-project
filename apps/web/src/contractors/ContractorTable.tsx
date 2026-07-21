import type { ReactNode } from 'react';
import { Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import {
  contractorTypeLabel,
  contractorVerificationLabel,
} from './labels';
import { ContractorStatusChip } from './ContractorStatusChip';
import { contractorUiState } from './contractorStatus';
import type { ContractorListRow } from './types';

type Props = {
  rows: readonly ContractorListRow[];
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
  canUpdate?: boolean;
  canBlock?: boolean;
  canActivate?: boolean;
  canVerify?: boolean;
  onEdit?: (row: ContractorListRow) => void;
  onBlock?: (row: ContractorListRow) => void;
  onActivate?: (row: ContractorListRow) => void;
  onVerify?: (row: ContractorListRow, verified: boolean) => void;
};

export function ContractorTable({
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
  canUpdate = false,
  canBlock = false,
  canActivate = false,
  canVerify = false,
  onEdit,
  onBlock,
  onActivate,
  onVerify,
}: Props) {
  const navigate = useNavigate();

  const columns: GridColDef<ContractorListRow>[] = [
    { field: 'contractorCode', headerName: 'Code', width: 120 },
    { field: 'legalName', headerName: 'Legal name', flex: 1, minWidth: 180 },
    {
      field: 'tradeName',
      headerName: 'Trade name',
      width: 140,
      valueGetter: (_v, row) => row.tradeName ?? '—',
    },
    {
      field: 'contractorType',
      headerName: 'Type',
      width: 120,
      valueGetter: (_v, row) => contractorTypeLabel(row.contractorType),
    },
    {
      field: 'gstin',
      headerName: 'GSTIN',
      width: 160,
      valueGetter: (_v, row) => row.gstin ?? '—',
    },
    {
      field: 'workCategories',
      headerName: 'Work',
      width: 180,
      sortable: false,
      renderCell: (params) => {
        const cats = params.row.workCategories ?? [];
        if (cats.length === 0) return '—';
        return (
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {cats.slice(0, 3).map((cat) => (
              <Chip key={cat} size="small" label={cat} />
            ))}
            {cats.length > 3 ? (
              <Chip size="small" label={`+${cats.length - 3}`} />
            ) : null}
          </Stack>
        );
      },
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 90,
      valueGetter: (_v, row) =>
        row.rating == null ? '—' : String(row.rating),
    },
    {
      field: 'verificationStatus',
      headerName: 'Verification',
      width: 130,
      valueGetter: (_v, row) =>
        contractorVerificationLabel(row.verificationStatus),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <ContractorStatusChip row={params.row} />,
    },
    {
      field: 'contactPerson',
      headerName: 'Contact',
      width: 140,
      valueGetter: (_v, row) => row.contactPerson ?? row.phone ?? '—',
    },
  ];

  const rowActions: DataTableRowAction<ContractorListRow>[] = [];

  if (canUpdate && onEdit) {
    rowActions.push({
      id: 'edit',
      label: 'Edit',
      onClick: onEdit,
    });
  }

  if (canVerify && onVerify) {
    rowActions.push(
      {
        id: 'verify',
        label: 'Verify',
        onClick: (row) => onVerify(row, true),
        disabled: (row) => !contractorUiState(row).canVerify,
      },
      {
        id: 'reject',
        label: 'Reject verification',
        danger: true,
        onClick: (row) => onVerify(row, false),
        disabled: (row) => !contractorUiState(row).canVerify,
      },
    );
  }

  if (canActivate && onActivate) {
    rowActions.push({
      id: 'activate',
      label: 'Activate',
      onClick: onActivate,
      disabled: (row) => !contractorUiState(row).canActivate,
    });
  }

  if (canBlock && onBlock) {
    rowActions.push({
      id: 'block',
      label: 'Block',
      danger: true,
      onClick: onBlock,
      disabled: (row) => !contractorUiState(row).canBlock,
    });
  }

  return (
    <DataTable
      title="Contractors"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No contractors"
      emptyDescription="Create a contractor or adjust filters."
      height={520}
      getRowId={(row) => row.id}
      onRowClick={(params) => {
        void navigate(`/contractors/${params.row.id}`);
      }}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search name, code, GSTIN, PAN…"
      preferencesKey="contractors-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
