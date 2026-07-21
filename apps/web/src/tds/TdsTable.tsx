import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import {
  tdsDeductionStatusLabel,
  tdsFormTypeLabel,
  tdsQuarterLabel,
  tdsReturnStatusLabel,
} from './labels';
import type { TdsDeductionListRow, TdsReturnListRow } from './types';

export function TdsDeductionTable({
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
}: {
  rows: readonly TdsDeductionListRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
}) {
  const columns: GridColDef<TdsDeductionListRow>[] = [
    { field: 'deductionNumber', headerName: 'Deduction #', width: 130 },
    { field: 'sectionCode', headerName: 'Section', width: 90 },
    { field: 'partyName', headerName: 'Party', flex: 1, minWidth: 160 },
    {
      field: 'transactionDate',
      headerName: 'Date',
      width: 110,
      valueGetter: (_v, row) => row.transactionDate.slice(0, 10),
    },
    { field: 'transactionAmount', headerName: 'Base', width: 100, type: 'number' },
    { field: 'tdsAmount', headerName: 'TDS', width: 100, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={tdsDeductionStatusLabel(params.row.status)} />
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

export function TdsReturnTable({
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
}: {
  rows: readonly TdsReturnListRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filterSlot?: ReactNode;
}) {
  const columns: GridColDef<TdsReturnListRow>[] = [
    { field: 'returnNumber', headerName: 'Return #', width: 130 },
    {
      field: 'formType',
      headerName: 'Form',
      width: 110,
      valueGetter: (_v, row) => tdsFormTypeLabel(row.formType),
    },
    {
      field: 'quarter',
      headerName: 'Quarter',
      width: 90,
      valueGetter: (_v, row) => tdsQuarterLabel(row.quarter),
    },
    { field: 'financialYearLabel', headerName: 'FY', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip size="small" label={tdsReturnStatusLabel(params.row.status)} />
      ),
    },
    { field: 'totalDeductees', headerName: 'Deductees', width: 100, type: 'number' },
    { field: 'totalTds', headerName: 'Total TDS', width: 110, type: 'number' },
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
