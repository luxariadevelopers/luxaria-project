import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import {
  gstDirectionLabel,
  gstDocumentStatusLabel,
  gstDocumentTypeLabel,
  gstPeriodLabel,
  gstReturnStatusLabel,
  gstReturnTypeLabel,
} from './labels';
import type { GstDocumentListRow, GstReturnListRow } from './types';

type DocProps = {
  rows: readonly GstDocumentListRow[];
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

export function GstDocumentTable({
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
}: DocProps) {
  const columns: GridColDef<GstDocumentListRow>[] = [
    { field: 'documentNumber', headerName: 'Document #', width: 130 },
    {
      field: 'documentType',
      headerName: 'Type',
      width: 120,
      valueGetter: (_v, row) => gstDocumentTypeLabel(row.documentType),
    },
    {
      field: 'direction',
      headerName: 'Direction',
      width: 100,
      valueGetter: (_v, row) => gstDirectionLabel(row.direction),
    },
    { field: 'partyName', headerName: 'Party', flex: 1, minWidth: 160 },
    {
      field: 'documentDate',
      headerName: 'Date',
      width: 110,
      valueGetter: (_v, row) => row.documentDate.slice(0, 10),
    },
    { field: 'taxableValue', headerName: 'Taxable', width: 100, type: 'number' },
    { field: 'totalValue', headerName: 'Total', width: 100, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={gstDocumentStatusLabel(params.row.status)} />
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      filterSlot={filterSlot}
      getRowId={(row) => row.id}
    />
  );
}

type RetProps = {
  rows: readonly GstReturnListRow[];
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

export function GstReturnTable({
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
}: RetProps) {
  const columns: GridColDef<GstReturnListRow>[] = [
    { field: 'returnNumber', headerName: 'Return #', width: 130 },
    {
      field: 'returnType',
      headerName: 'Type',
      width: 110,
      valueGetter: (_v, row) => gstReturnTypeLabel(row.returnType),
    },
    {
      field: 'period',
      headerName: 'Period',
      width: 100,
      valueGetter: (_v, row) => gstPeriodLabel(row.periodMonth, row.periodYear),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={gstReturnStatusLabel(params.row.status)} />
      ),
    },
    { field: 'taxPayable', headerName: 'Tax payable', width: 110, type: 'number' },
    { field: 'itcAvailable', headerName: 'ITC', width: 100, type: 'number' },
    {
      field: 'filedAt',
      headerName: 'Filed',
      width: 110,
      valueGetter: (_v, row) => (row.filedAt ? row.filedAt.slice(0, 10) : '—'),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      filterSlot={filterSlot}
      getRowId={(row) => row.id}
    />
  );
}
