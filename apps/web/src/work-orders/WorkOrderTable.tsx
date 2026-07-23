import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import type { WorkOrderCapabilities } from './roleAccess';
import type { PublicWorkOrder } from './types';
import { WorkOrderStatusChip } from './WorkOrderStatusChip';
import { resolveWorkOrderActions } from './workflowActions';

type Props = {
  rows: readonly PublicWorkOrder[];
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
  caps: WorkOrderCapabilities;
  contractorLabel: (contractorId: string) => string;
  onOpenDetail?: (row: PublicWorkOrder) => void;
  onEdit?: (row: PublicWorkOrder) => void;
  onSubmit?: (row: PublicWorkOrder) => void;
  onApprove?: (row: PublicWorkOrder) => void;
  onIssue?: (row: PublicWorkOrder) => void;
  onCancel?: (row: PublicWorkOrder) => void;
};

export function WorkOrderTable({
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
  contractorLabel,
  onOpenDetail,
  onEdit,
  onSubmit,
  onApprove,
  onIssue,
  onCancel,
}: Props) {
  const filtered = search.trim()
    ? rows.filter((row) =>
        row.workOrderNumber
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : rows;

  const columns: GridColDef<PublicWorkOrder>[] = [
    {
      field: 'workOrderNumber',
      headerName: 'Number',
      width: 150,
    },
    {
      field: 'activeRevision',
      headerName: 'Rev',
      width: 70,
      valueGetter: (_v, row) => `r${row.activeRevision}`,
    },
    {
      field: 'contractorId',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => contractorLabel(row.contractorId),
    },
    {
      field: 'contractValue',
      headerName: 'Value',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.contractValue),
    },
    {
      field: 'startDate',
      headerName: 'Start',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.startDate),
    },
    {
      field: 'endDate',
      headerName: 'End',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.endDate),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => (
        <WorkOrderStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions = (
    row: PublicWorkOrder,
  ): DataTableRowAction<PublicWorkOrder>[] => {
    const ids = resolveWorkOrderActions(row, caps);
    const actions: DataTableRowAction<PublicWorkOrder>[] = [];

    if (onOpenDetail) {
      actions.push({
        id: 'open',
        label: 'Open',
        onClick: () => onOpenDetail(row),
      });
    }
    if (ids.includes('edit') && onEdit) {
      actions.push({ id: 'edit', label: 'Edit', onClick: () => onEdit(row) });
    }
    if (ids.includes('submit') && onSubmit) {
      actions.push({
        id: 'submit',
        label: 'Submit',
        onClick: () => onSubmit(row),
      });
    }
    if (ids.includes('approve') && onApprove) {
      actions.push({
        id: 'approve',
        label: 'Approve',
        onClick: () => onApprove(row),
      });
    }
    if (ids.includes('issue') && onIssue) {
      actions.push({
        id: 'issue',
        label: 'Issue',
        onClick: () => onIssue(row),
      });
    }
    if (ids.includes('cancel') && onCancel) {
      actions.push({
        id: 'cancel',
        label: 'Cancel',
        onClick: () => onCancel(row),
      });
    }

    return actions;
  };

  return (
    <DataTable
      title="Work orders"
      rows={filtered}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={search.trim() ? filtered.length : rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search work order number…"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      getRowId={(row) => row.id}
      rowActions={rowActions}
      onRowClick={
        onOpenDetail ? (params) => onOpenDetail(params.row) : undefined
      }
      height={520}
      data-testid="work-order-table"
      mobileCard={{
        primaryField: 'workOrderNumber',
        metaFields: ['contractorId', 'contractValue'],
        statusField: 'status',
      }}
    />
  );
}
