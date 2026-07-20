import type { ReactNode } from 'react';
import { Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { vendorVerificationLabel } from './labels';
import { VendorRating } from './VendorRating';
import { VendorStatusChip } from './VendorStatusChip';
import type { VendorListRow } from './types';
import { vendorUiState } from './vendorStatus';

type Props = {
  rows: readonly VendorListRow[];
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
  onEdit?: (row: VendorListRow) => void;
  onBlock?: (row: VendorListRow) => void;
  onActivate?: (row: VendorListRow) => void;
  onVerify?: (row: VendorListRow, verified: boolean) => void;
};

export function VendorTable({
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
  const columns: GridColDef<VendorListRow>[] = [
    { field: 'vendorCode', headerName: 'Code', width: 120 },
    { field: 'legalName', headerName: 'Legal name', flex: 1, minWidth: 180 },
    {
      field: 'tradeName',
      headerName: 'Trade name',
      width: 140,
      valueGetter: (_v, row) => row.tradeName ?? '—',
    },
    {
      field: 'gstin',
      headerName: 'GSTIN',
      width: 160,
      valueGetter: (_v, row) => row.gstin ?? '—',
    },
    {
      field: 'pan',
      headerName: 'PAN',
      width: 120,
      valueGetter: (_v, row) => row.pan ?? '—',
    },
    {
      field: 'materialCategories',
      headerName: 'Categories',
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (params) => {
        const cats = params.row.materialCategories;
        if (!cats.length) return '—';
        return (
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', py: 0.5 }}
            data-testid="vendor-categories"
          >
            {cats.slice(0, 3).map((cat) => (
              <Chip key={cat} size="small" label={cat} variant="outlined" />
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
      width: 110,
      renderCell: (params) => <VendorRating rating={params.row.rating} />,
    },
    {
      field: 'verificationStatus',
      headerName: 'Verification',
      width: 130,
      valueGetter: (_v, row) => vendorVerificationLabel(row.verificationStatus),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <VendorStatusChip row={params.row} />,
    },
    {
      field: 'contactPerson',
      headerName: 'Contact',
      width: 140,
      valueGetter: (_v, row) => row.contactPerson ?? row.phone ?? '—',
    },
  ];

  const rowActions: DataTableRowAction<VendorListRow>[] = [];

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
        disabled: (row) => !vendorUiState(row).canVerify,
      },
      {
        id: 'reject',
        label: 'Reject verification',
        danger: true,
        onClick: (row) => onVerify(row, false),
        disabled: (row) => !vendorUiState(row).canVerify,
      },
    );
  }

  if (canActivate && onActivate) {
    rowActions.push({
      id: 'activate',
      label: 'Activate',
      onClick: onActivate,
      disabled: (row) => !vendorUiState(row).canActivate,
    });
  }

  if (canBlock && onBlock) {
    rowActions.push({
      id: 'block',
      label: 'Block',
      danger: true,
      onClick: onBlock,
      disabled: (row) => !vendorUiState(row).canBlock,
    });
  }

  return (
    <DataTable
      title="Vendors"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No vendors"
      emptyDescription="Create a vendor or adjust filters (try clearing Blocked)."
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
      searchPlaceholder="Search name, code, GSTIN, PAN…"
      preferencesKey="vendors-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
