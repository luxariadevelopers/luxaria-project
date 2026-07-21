import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate } from '@/format';
import { manpowerPlanSourceLabel } from './labels';
import { manpowerPlanDetailPath } from './routes';
import type { ManpowerPlanCapabilities } from './roleAccess';
import type { PublicManpowerDailyPlan } from './types';

type Props = {
  rows: readonly PublicManpowerDailyPlan[];
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
  caps: ManpowerPlanCapabilities;
  contractorLabel: (contractorId: string) => string;
};

export function PlansTable({
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
}: Props) {
  const navigate = useNavigate();

  const columns: GridColDef<PublicManpowerDailyPlan>[] = [
    {
      field: 'planNumber',
      headerName: 'Plan #',
      width: 150,
    },
    {
      field: 'planDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.planDate),
    },
    {
      field: 'contractorId',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => contractorLabel(row.contractorId),
    },
    {
      field: 'plannedHeadcount',
      headerName: 'Planned',
      width: 100,
    },
    {
      field: 'skillMix',
      headerName: 'Skills',
      width: 90,
      valueGetter: (_v, row) => row.skillMix.length,
      sortable: false,
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 150,
      renderCell: (params) => (
        <Chip
          size="small"
          label={manpowerPlanSourceLabel(params.row.source)}
          variant="outlined"
        />
      ),
      sortable: false,
    },
  ];

  const openPlan = (row: PublicManpowerDailyPlan) => {
    navigate(manpowerPlanDetailPath(row.id));
  };

  const rowActions: DataTableRowAction<PublicManpowerDailyPlan>[] = [
    { id: 'open', label: 'Open', onClick: openPlan },
  ];

  return (
    <DataTable<PublicManpowerDailyPlan>
      title="Daily Manpower Plans"
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
      preferencesKey="manpower-plans-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={caps.canView ? rowActions : undefined}
      onRowClick={(params) => openPlan(params.row)}
      emptyTitle="No manpower plans"
      emptyDescription={
        caps.canManage
          ? 'Create a daily plan for a contractor or adjust filters.'
          : 'No plans match the current filters.'
      }
      height={520}
    />
  );
}
