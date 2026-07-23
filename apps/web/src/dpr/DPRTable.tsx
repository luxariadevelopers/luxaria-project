import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Chip, Link } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { mediaCount } from './api';
import { dprWeatherLabel } from './labels';
import { DprStatusChip } from './DprStatusChip';
import { dprDetailPath } from './routes';
import type { PublicDailyProgressReport } from './types';

type Props = {
  rows: readonly PublicDailyProgressReport[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
};

export function DPRTable({
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
}: Props) {
  const columns: GridColDef<PublicDailyProgressReport>[] = [
    {
      field: 'dprNumber',
      headerName: 'DPR No',
      width: 150,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={dprDetailPath(params.row.id)}
          underline="hover"
          data-testid={`dpr-link-${params.row.id}`}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: 'reportDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.reportDate),
    },
    {
      field: 'weather',
      headerName: 'Weather',
      width: 110,
      valueGetter: (_v, row) => dprWeatherLabel(String(row.weather)),
    },
    {
      field: 'labourCount',
      headerName: 'Labour',
      width: 90,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <DprStatusChip status={String(params.value)} />,
    },
    {
      field: 'mediaCount',
      headerName: 'Media',
      width: 90,
      sortable: false,
      valueGetter: (_v, row) => mediaCount(row),
      renderCell: (params) => (
        <Chip
          size="small"
          variant="outlined"
          label={String(params.value ?? 0)}
          data-testid={`dpr-media-${params.row.id}`}
        />
      ),
    },
    {
      field: 'siteCashBalance',
      headerName: 'Site cash',
      width: 140,
      valueFormatter: (value: number) => formatInr(value),
    },
    {
      field: 'workPerformed',
      headerName: 'Work performed',
      flex: 1,
      minWidth: 220,
      valueGetter: (_v, row) => row.workPerformed || '—',
    },
  ];

  return (
    <DataTable
      title="Daily progress reports"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      paginationMode="server"
      filterSlot={filterSlot}
      height={520}
      getRowId={(row) => row.id}
      mobileCard={{
        primaryField: 'dprNumber',
        metaFields: ['reportDate', 'weather'],
        statusField: 'status',
      }}
    />
  );
}
