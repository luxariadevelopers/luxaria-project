import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/DataTable';
import { directorStatusLabel } from './directorStatus';
import {
  formatShareholdingPercent,
  holdingForDirector,
} from './shareholdingDisplay';
import type { PublicDirector, PublicShareholding } from './types';

type Props = {
  rows: readonly PublicDirector[];
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
  holdingsByDirector?: readonly PublicShareholding[];
  showShareholding?: boolean;
  toolbarActions?: ReactNode;
};

export function DirectorTable({
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
  holdingsByDirector = [],
  showShareholding = false,
  toolbarActions,
}: Props) {
  const navigate = useNavigate();

  const columns: GridColDef<PublicDirector>[] = [
    { field: 'directorCode', headerName: 'Code', width: 120 },
    { field: 'fullName', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'din',
      headerName: 'DIN',
      width: 120,
      valueGetter: (_v, row) => row.din ?? '—',
    },
    {
      field: 'pan',
      headerName: 'PAN',
      width: 130,
      valueGetter: (_v, row) => row.pan ?? '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          size="small"
          label={directorStatusLabel(params.row.status)}
          variant="outlined"
        />
      ),
    },
    ...(showShareholding
      ? [
          {
            field: 'shareholding',
            headerName: 'Shareholding',
            width: 130,
            sortable: false,
            valueGetter: (_v: unknown, row: PublicDirector) => {
              const holding = holdingForDirector(holdingsByDirector, row.id);
              return holding
                ? formatShareholdingPercent(holding.percentage)
                : '—';
            },
          } satisfies GridColDef<PublicDirector>,
        ]
      : []),
    {
      field: 'isPlaceholder',
      headerName: 'Seed',
      width: 90,
      valueGetter: (_v, row) => (row.isPlaceholder ? 'Yes' : '—'),
    },
  ];

  return (
    <DataTable
      title="Directors"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No directors"
      emptyDescription="Create a director or adjust search filters."
      height={520}
      getRowId={(row) => row.id}
      onRowClick={(params) => {
        void navigate(`/capital/directors/${params.row.id}`);
      }}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search name, code, DIN, PAN…"
      preferencesKey="directors-list"
      toolbarActions={toolbarActions}
    />
  );
}
