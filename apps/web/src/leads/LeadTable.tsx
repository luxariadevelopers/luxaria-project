import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { leadSourceLabel, leadStatusLabel } from './labels';
import type { LeadListRow } from './types';

type Props = {
  rows: readonly LeadListRow[];
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
  canManage?: boolean;
  onTransition?: (row: LeadListRow) => void;
};

export function LeadTable({
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
  canManage = false,
  onTransition,
}: Props) {
  const navigate = useNavigate();

  const columns: GridColDef<LeadListRow>[] = [
    { field: 'leadNumber', headerName: 'Lead #', width: 120 },
    {
      field: 'fullName',
      headerName: 'Contact',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.contact.fullName,
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 130,
      valueGetter: (_v, row) => row.contact.phone ?? '—',
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 140,
      valueGetter: (_v, row) => leadSourceLabel(row.source),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip size="small" label={leadStatusLabel(params.row.status)} />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      valueGetter: (_v, row) =>
        row.createdAt ? row.createdAt.slice(0, 10) : '—',
    },
  ];

  const rowActions: DataTableRowAction<LeadListRow>[] = [];
  if (canManage && onTransition) {
    rowActions.push({
      label: 'Transition',
      onClick: (row) => onTransition(row),
    });
  }

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search name, phone, email…"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions}
      onRowClick={(row) => navigate(`/sales/leads/${row.id}`)}
    />
  );
}
