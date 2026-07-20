import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import { MaterialIssueStatusChip } from './MaterialIssueStatusChip';
import type { MaterialIssueCapabilities } from './roleAccess';
import type { PublicMaterialIssue } from './types';
import { resolveMaterialIssueRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicMaterialIssue[];
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
  caps: MaterialIssueCapabilities;
  onOpenDetail?: (row: PublicMaterialIssue) => void;
  onSubmit?: (row: PublicMaterialIssue) => void;
  onConfirm?: (row: PublicMaterialIssue) => void;
  onReturn?: (row: PublicMaterialIssue) => void;
  onCancel?: (row: PublicMaterialIssue) => void;
  onAttachSignature?: (row: PublicMaterialIssue) => void;
};

export function MaterialIssueTable({
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
  onOpenDetail,
  onSubmit,
  onConfirm,
  onReturn,
  onCancel,
  onAttachSignature,
}: Props) {
  const columns: GridColDef<PublicMaterialIssue>[] = [
    {
      field: 'issueNumber',
      headerName: 'Issue #',
      width: 150,
    },
    {
      field: 'issueDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.issueDate),
    },
    {
      field: 'workLocation',
      headerName: 'Work location',
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'boqItemId',
      headerName: 'BOQ item',
      width: 140,
    },
    {
      field: 'itemCount',
      headerName: 'Lines',
      width: 80,
      valueGetter: (_v, row) => row.items?.length ?? 0,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <MaterialIssueStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicMaterialIssue>[] = [];

  if (onOpenDetail) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpenDetail,
    });
  }
  if (onAttachSignature && caps.canAttachSignatures) {
    rowActions.push({
      id: 'attach_signature',
      label: 'Signature',
      onClick: onAttachSignature,
      disabled: (row) =>
        !resolveMaterialIssueRowActions(row, caps).includes('attach_signature'),
    });
  }
  if (onSubmit && caps.canSubmit) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveMaterialIssueRowActions(row, caps).includes('submit'),
    });
  }
  if (onConfirm && caps.canConfirm) {
    rowActions.push({
      id: 'confirm',
      label: 'Confirm',
      onClick: onConfirm,
      disabled: (row) =>
        !resolveMaterialIssueRowActions(row, caps).includes('confirm'),
    });
  }
  if (onReturn && caps.canReturn) {
    rowActions.push({
      id: 'return',
      label: 'Return',
      onClick: onReturn,
      disabled: (row) =>
        !resolveMaterialIssueRowActions(row, caps).includes('return'),
    });
  }
  if (onCancel && caps.canCancel) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      onClick: onCancel,
      disabled: (row) =>
        !resolveMaterialIssueRowActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Material Issues"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No material issues"
      emptyDescription="Issue materials to work or adjust filters."
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
      searchPlaceholder="Search issue number…"
      preferencesKey="material-issues-list"
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
