import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import { qualityInspectionResultLabel } from './labels';
import { QualityInspectionResultChip } from './QualityInspectionResultChip';
import { QualityInspectionStatusChip } from './QualityInspectionStatusChip';
import type { QualityInspectionCapabilities } from './roleAccess';
import type { PublicQualityInspection } from './types';
import { resolveQualityInspectionRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicQualityInspection[];
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
  caps: QualityInspectionCapabilities;
  onComplete?: (row: PublicQualityInspection) => void;
  onCancel?: (row: PublicQualityInspection) => void;
  onOpenDetail?: (row: PublicQualityInspection) => void;
};

export function QualityInspectionTable({
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
  onComplete,
  onCancel,
  onOpenDetail,
}: Props) {
  const columns: GridColDef<PublicQualityInspection>[] = [
    {
      field: 'inspectionNumber',
      headerName: 'Number',
      width: 150,
    },
    {
      field: 'inspectionDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.inspectionDate),
    },
    {
      field: 'grnId',
      headerName: 'GRN',
      width: 160,
      valueGetter: (_v, row) => row.grnId,
    },
    {
      field: 'vendorId',
      headerName: 'Vendor',
      width: 160,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <QualityInspectionStatusChip status={params.row.status} />
      ),
    },
    {
      field: 'result',
      headerName: 'Result',
      width: 150,
      renderCell: (params) => (
        <QualityInspectionResultChip result={params.row.result} />
      ),
      valueGetter: (_v, row) => qualityInspectionResultLabel(row.result),
    },
    {
      field: 'items',
      headerName: 'Lines',
      width: 80,
      type: 'number',
      valueGetter: (_v, row) => row.items.length,
    },
  ];

  const rowActions: DataTableRowAction<PublicQualityInspection>[] = [];

  if (onOpenDetail) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpenDetail,
    });
  }
  if (onComplete && caps.canInspect) {
    rowActions.push({
      id: 'complete',
      label: 'Record result',
      onClick: onComplete,
      disabled: (row) =>
        !resolveQualityInspectionRowActions(row, caps).includes('complete'),
    });
  }
  if (onCancel && caps.canInspect) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      danger: true,
      onClick: onCancel,
      disabled: (row) =>
        !resolveQualityInspectionRowActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Quality inspections"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No quality inspections"
      emptyDescription="Create an inspection against a submitted or quality-check GRN."
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
      searchPlaceholder="Search inspection number…"
      preferencesKey="quality-inspections-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={
        onOpenDetail ? (params) => onOpenDetail(params.row) : undefined
      }
    />
  );
}
