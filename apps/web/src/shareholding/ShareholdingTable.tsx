import { useMemo } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/data-table';
import { formatDate } from '@/format';
import {
  formatShareholdingPercent,
} from '@/directors/shareholdingDisplay';
import type { PublicShareholding } from '@/directors/types';

type Props = {
  rows: PublicShareholding[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  title?: string;
  /** Highlight rows with overlapping intervals. */
  overlappedIds?: ReadonlySet<string>;
};

/**
 * Versioned shareholding table (active + historical). Read-only — no overwrite.
 */
export function ShareholdingTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  title = 'Shareholding history',
  overlappedIds,
}: Props) {
  const columns: GridColDef<PublicShareholding>[] = useMemo(
    () => [
      {
        field: 'version',
        headerName: 'Ver',
        width: 70,
        type: 'number',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        sortable: false,
        renderCell: (params) => {
          const active = params.row.effectiveTo == null;
          const overlapped = overlappedIds?.has(params.row.id);
          if (overlapped) {
            return <Chip size="small" color="error" label="Overlap" />;
          }
          return (
            <Chip
              size="small"
              color={active ? 'success' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              label={active ? 'Active' : 'Historical'}
            />
          );
        },
      },
      {
        field: 'directorId',
        headerName: 'Director',
        width: 140,
        valueFormatter: (value: string) => `…${value.slice(-8)}`,
      },
      {
        field: 'percentage',
        headerName: '%',
        width: 90,
        valueFormatter: (value: number) => formatShareholdingPercent(value),
      },
      {
        field: 'numberOfShares',
        headerName: 'Shares',
        width: 110,
        type: 'number',
      },
      {
        field: 'faceValue',
        headerName: 'Face value',
        width: 110,
        type: 'number',
      },
      {
        field: 'effectiveFrom',
        headerName: 'Effective from',
        width: 140,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: 'effectiveTo',
        headerName: 'Effective to',
        width: 140,
        valueFormatter: (value: string | null) =>
          value ? formatDate(value) : 'Present',
      },
      {
        field: 'approvalReference',
        headerName: 'Approval ref',
        flex: 1,
        minWidth: 140,
        valueFormatter: (value: string | null) => value ?? '—',
      },
    ],
    [overlappedIds],
  );

  return (
    <DataTable<PublicShareholding>
      title={title}
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No shareholding history"
      emptyDescription="Approved company equity versions will appear here. Prior versions are never overwritten."
      paginationMode="server"
      sortingMode="client"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      getRowId={(row) => row.id}
      height={440}
      showColumnVisibility
      showExport={false}
      preferencesKey="shareholding-history"
      mobileCard={{
        primaryField: 'directorId',
        metaFields: ['percentage', 'numberOfShares'],
        statusField: 'status',
      }}
    />
  );
}
