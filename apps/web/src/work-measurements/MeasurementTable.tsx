import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import { workMeasurementUnitLabel } from './labels';
import { MeasurementStatusChip } from './MeasurementStatusChip';
import type { WorkMeasurementCapabilities } from './roleAccess';
import type { PublicWorkMeasurement } from './types';
import { resolveWorkMeasurementRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicWorkMeasurement[];
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
  caps: WorkMeasurementCapabilities;
  currentUserId?: string;
  onOpen?: (row: PublicWorkMeasurement) => void;
  onEdit?: (row: PublicWorkMeasurement) => void;
  onSubmit?: (row: PublicWorkMeasurement) => void;
  onVerify?: (row: PublicWorkMeasurement) => void;
  onCertify?: (row: PublicWorkMeasurement) => void;
  onReject?: (row: PublicWorkMeasurement) => void;
  onCancel?: (row: PublicWorkMeasurement) => void;
};

export function MeasurementTable({
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
  currentUserId,
  onOpen,
  onEdit,
  onSubmit,
  onVerify,
  onCertify,
  onReject,
  onCancel,
}: Props) {
  const columns: GridColDef<PublicWorkMeasurement>[] = [
    {
      field: 'measurementNumber',
      headerName: 'Measurement #',
      width: 160,
    },
    {
      field: 'measurementDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.measurementDate),
    },
    {
      field: 'boqCode',
      headerName: 'BOQ',
      width: 120,
      valueGetter: (_v, row) => row.boqCode ?? row.boqItemId,
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'currentQuantity',
      headerName: 'This period',
      width: 120,
      valueGetter: (_v, row) =>
        `${row.currentQuantity} ${workMeasurementUnitLabel(row.unit)}`,
    },
    {
      field: 'cumulativeQuantity',
      headerName: 'Cumulative',
      width: 120,
      valueGetter: (_v, row) =>
        `${row.cumulativeQuantity} / ${row.boqPlannedQuantity}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <MeasurementStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicWorkMeasurement>[] = [];

  if (onOpen) {
    rowActions.push({
      id: 'open',
      label: 'Open',
      onClick: onOpen,
    });
  }

  if (onEdit && caps.canUpdate) {
    rowActions.push({
      id: 'edit',
      label: 'Edit',
      onClick: onEdit,
      disabled: (row) =>
        !resolveWorkMeasurementRowActions(row, caps, currentUserId).includes(
          'edit',
        ),
    });
  }

  if (onSubmit && caps.canSubmit) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveWorkMeasurementRowActions(row, caps, currentUserId).includes(
          'submit',
        ),
    });
  }

  if (onVerify && caps.canVerify) {
    rowActions.push({
      id: 'verify',
      label: 'Verify',
      onClick: onVerify,
      disabled: (row) =>
        !resolveWorkMeasurementRowActions(row, caps, currentUserId).includes(
          'verify',
        ),
    });
  }

  if (onCertify && caps.canCertify) {
    rowActions.push({
      id: 'certify',
      label: 'Certify',
      onClick: onCertify,
      disabled: (row) =>
        !resolveWorkMeasurementRowActions(row, caps, currentUserId).includes(
          'certify',
        ),
    });
  }

  if (onReject && caps.canReject) {
    rowActions.push({
      id: 'reject',
      label: 'Reject',
      onClick: onReject,
      disabled: (row) =>
        !resolveWorkMeasurementRowActions(row, caps, currentUserId).includes(
          'reject',
        ),
    });
  }

  if (onCancel && caps.canCancel) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      onClick: onCancel,
      disabled: (row) =>
        !resolveWorkMeasurementRowActions(row, caps, currentUserId).includes(
          'cancel',
        ),
    });
  }

  return (
    <DataTable
      title="Work Measurements"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No work measurements"
      emptyDescription="Record a measurement or adjust filters."
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
      searchPlaceholder="Search measurement number…"
      preferencesKey="work-measurements-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={onOpen ? (params) => onOpen(params.row) : undefined}
    />
  );
}
