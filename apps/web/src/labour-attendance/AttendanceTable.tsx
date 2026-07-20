import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import { detectListSheetDuplicates, detectSheetDuplicates } from './detectDuplicates';
import { attendanceStatusLabel } from './labels';
import type { LabourAttendanceCapabilities } from './roleAccess';
import {
  LabourAttendanceStatus,
  type PublicLabourAttendance,
} from './types';

type Props = {
  rows: readonly PublicLabourAttendance[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
  caps: LabourAttendanceCapabilities;
  contractorLabel: (contractorId: string) => string;
  onOpen: (row: PublicLabourAttendance) => void;
  onConfirm?: (row: PublicLabourAttendance) => void;
};

export function AttendanceTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  filterSlot,
  toolbarActions,
  caps,
  contractorLabel,
  onOpen,
  onConfirm,
}: Props) {
  const listDupes = detectListSheetDuplicates(rows);

  const columns: GridColDef<PublicLabourAttendance>[] = [
    {
      field: 'attendanceNumber',
      headerName: 'Sheet #',
      width: 150,
    },
    {
      field: 'attendanceDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.attendanceDate),
    },
    {
      field: 'contractorId',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => contractorLabel(row.contractorId),
    },
    {
      field: 'totalWorkers',
      headerName: 'Workers',
      width: 100,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      valueGetter: (_v, row) => attendanceStatusLabel(row.status),
    },
    {
      field: 'evidence',
      headerName: 'Evidence',
      width: 140,
      sortable: false,
      valueGetter: (_v, row) => {
        const gps =
          row.latitude != null && row.longitude != null ? 'GPS' : 'No GPS';
        const photos = `${row.groupPhotoDocumentIds.length} photo${
          row.groupPhotoDocumentIds.length === 1 ? '' : 's'
        }`;
        return `${gps} · ${photos}`;
      },
    },
    {
      field: 'duplicates',
      headerName: 'Flags',
      width: 160,
      sortable: false,
      renderCell: (params) => {
        const sheetFlags = detectSheetDuplicates(params.row.lines);
        const listFlags = listDupes.get(params.row.id) ?? [];
        const all = [...listFlags, ...sheetFlags];
        if (all.length === 0) {
          return (
            <Chip size="small" label="OK" color="success" variant="outlined" />
          );
        }
        return (
          <Chip
            size="small"
            color="warning"
            label={`${all.length} duplicate`}
            data-testid={`duplicate-flag-${params.row.id}`}
          />
        );
      },
    },
  ];

  const rowActions: DataTableRowAction<PublicLabourAttendance>[] = [
    { id: 'open', label: 'Review', onClick: onOpen },
  ];
  if (caps.canConfirm && onConfirm) {
    rowActions.push({
      id: 'confirm',
      label: 'Confirm',
      onClick: onConfirm,
      disabled: (row) => row.status !== LabourAttendanceStatus.Submitted,
    });
  }

  return (
    <DataTable<PublicLabourAttendance>
      title="Labour Attendance"
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
      preferencesKey="labour-attendance-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions}
      onRowClick={(params) => onOpen(params.row)}
      emptyTitle="No attendance sheets"
      emptyDescription="No labour attendance matches the current project and filters."
      height={520}
    />
  );
}
