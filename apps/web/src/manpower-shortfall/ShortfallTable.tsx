import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import { ConsecutiveDayIndicator } from './ConsecutiveDayIndicator';
import {
  manpowerEscalationLabel,
  shortfallAlertTypeLabel,
  shortfallSeverityLabel,
} from './labels';
import type { ManpowerShortfallCapabilities } from './roleAccess';
import { shortfallSeverity } from './shortfallSeverity';
import {
  ShortfallSeverity,
  type PublicManpowerShortfallAlert,
} from './types';

type Props = {
  rows: readonly PublicManpowerShortfallAlert[];
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
  caps: ManpowerShortfallCapabilities;
  contractorLabel: (contractorId: string) => string;
  onSelect: (row: PublicManpowerShortfallAlert) => void;
  onAcknowledge?: (row: PublicManpowerShortfallAlert) => void;
};

export function ShortfallTable({
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
  onSelect,
  onAcknowledge,
}: Props) {
  const columns: GridColDef<PublicManpowerShortfallAlert>[] = [
    {
      field: 'severity',
      headerName: 'Severity',
      width: 110,
      renderCell: (params) => {
        const severity = shortfallSeverity(params.row.alertType);
        return (
          <Chip
            size="small"
            label={shortfallSeverityLabel(severity)}
            color={
              severity === ShortfallSeverity.Critical ? 'error' : 'warning'
            }
            data-testid={`shortfall-severity-${params.row.id}`}
          />
        );
      },
      sortable: false,
    },
    {
      field: 'asOfDate',
      headerName: 'As of',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.asOfDate),
    },
    {
      field: 'contractorId',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 150,
      valueGetter: (_v, row) => contractorLabel(row.contractorId),
    },
    {
      field: 'alertType',
      headerName: 'Alert',
      width: 200,
      valueGetter: (_v, row) => shortfallAlertTypeLabel(row.alertType),
    },
    {
      field: 'headcount',
      headerName: 'A / P / Act',
      width: 120,
      valueGetter: (_v, row) =>
        `${row.agreementHeadcount}/${row.plannedHeadcount}/${row.actualHeadcount}`,
    },
    {
      field: 'shortfallPercent',
      headerName: 'Shortfall %',
      width: 110,
    },
    {
      field: 'consecutiveDays',
      headerName: 'Streak',
      width: 100,
      renderCell: (params) => (
        <ConsecutiveDayIndicator
          consecutiveDays={params.row.consecutiveDays}
          alertType={params.row.alertType}
        />
      ),
      sortable: false,
    },
    {
      field: 'expectedScheduleImpactDays',
      headerName: 'Impact days',
      width: 110,
    },
    {
      field: 'recommendedEscalation',
      headerName: 'Escalate to',
      width: 140,
      valueGetter: (_v, row) =>
        manpowerEscalationLabel(row.recommendedEscalation),
    },
    {
      field: 'acknowledged',
      headerName: 'Ack',
      width: 80,
      valueGetter: (_v, row) => (row.acknowledged ? 'Yes' : 'No'),
    },
  ];

  const rowActions: DataTableRowAction<PublicManpowerShortfallAlert>[] = [
    { id: 'open', label: 'Open', onClick: onSelect },
  ];
  if (caps.canEscalate && onAcknowledge) {
    rowActions.push({
      id: 'acknowledge',
      label: 'Acknowledge',
      onClick: onAcknowledge,
      disabled: (row) => row.acknowledged,
    });
  }

  return (
    <DataTable<PublicManpowerShortfallAlert>
      title="Manpower Shortfall"
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
      preferencesKey="manpower-shortfall-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions}
      onRowClick={(params) => onSelect(params.row)}
      emptyTitle="No shortfall alerts"
      emptyDescription="Run evaluation or adjust filters to see manpower shortfalls."
      height={520}
    />
  );
}
