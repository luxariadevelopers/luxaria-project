import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatInr } from '@/format';
import {
  labourCategoryStatusLabel,
  labourSkillLevelLabel,
} from './labels';
import type { LabourCategoryCapabilities } from './roleAccess';
import {
  LabourCategoryStatus,
  type PublicLabourCategory,
} from './types';

type Props = {
  rows: readonly PublicLabourCategory[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
  caps: LabourCategoryCapabilities;
  onOpen: (row: PublicLabourCategory) => void;
  onActivate?: (row: PublicLabourCategory) => void;
  onDeactivate?: (row: PublicLabourCategory) => void;
};

export function LabourCategoryTable({
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
  onOpen,
  onActivate,
  onDeactivate,
}: Props) {
  const columns: GridColDef<PublicLabourCategory>[] = [
    {
      field: 'categoryCode',
      headerName: 'Code',
      width: 130,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'skillLevel',
      headerName: 'Skill',
      width: 140,
      valueGetter: (_v, row) => labourSkillLevelLabel(row.skillLevel),
    },
    {
      field: 'defaultDailyRate',
      headerName: 'Daily rate',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.defaultDailyRate),
    },
    {
      field: 'overtimeRate',
      headerName: 'OT rate',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.overtimeRate),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          size="small"
          label={labourCategoryStatusLabel(params.row.status)}
          color={
            params.row.status === LabourCategoryStatus.Active
              ? 'success'
              : 'default'
          }
          variant="outlined"
        />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicLabourCategory>[] = [
    {
      id: 'open',
      label: 'Open',
      onClick: onOpen,
    },
  ];

  if (caps.canManage && onActivate) {
    rowActions.push({
      id: 'activate',
      label: 'Activate',
      onClick: onActivate,
      disabled: (row) => row.status === LabourCategoryStatus.Active,
    });
  }
  if (caps.canManage && onDeactivate) {
    rowActions.push({
      id: 'deactivate',
      label: 'Deactivate',
      onClick: onDeactivate,
      disabled: (row) => row.status === LabourCategoryStatus.Inactive,
    });
  }

  return (
    <DataTable<PublicLabourCategory>
      title="Labour Categories"
      rows={[...rows]}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search name or code…"
      preferencesKey="labour-categories-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions}
      onRowClick={(params) => onOpen(params.row)}
      emptyTitle="No labour categories"
      emptyDescription="Seed standard trades or create a category to reuse across attendance and vouchers."
      height={520}
    />
  );
}
