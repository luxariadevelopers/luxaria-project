import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatDate } from '@/format';
import { materialUnitLabel, stockTransactionTypeLabel } from './labels';
import {
  formatReferenceLabel,
  resolveStockLedgerTransactionLink,
} from './transactionLinks';
import type { StockLedgerRow } from './types';

type Props = {
  rows: readonly StockLedgerRow[];
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
};

function formatQty(value: number): string {
  if (Math.abs(value) < 1e-9) return '—';
  return String(value);
}

export function LedgerTable({
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
}: Props) {
  const columns: GridColDef<StockLedgerRow>[] = [
    {
      field: 'transactionNumber',
      headerName: 'Txn',
      width: 150,
    },
    {
      field: 'transactionDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.transactionDate),
    },
    {
      field: 'transactionType',
      headerName: 'Type',
      width: 150,
      valueGetter: (_v, row) => stockTransactionTypeLabel(row.transactionType),
    },
    {
      field: 'materialId',
      headerName: 'Material',
      width: 140,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 120,
      valueGetter: (_v, row) => row.location || '—',
    },
    {
      field: 'quantityIn',
      headerName: 'Qty in',
      width: 90,
      valueGetter: (_v, row) => formatQty(row.quantityIn),
    },
    {
      field: 'quantityOut',
      headerName: 'Qty out',
      width: 90,
      valueGetter: (_v, row) => formatQty(row.quantityOut),
    },
    {
      field: 'baseUnit',
      headerName: 'Unit',
      width: 100,
      valueGetter: (_v, row) => materialUnitLabel(row.baseUnit),
    },
    {
      field: 'runningBalance',
      headerName: 'Running bal (base)',
      width: 150,
      valueGetter: (_v, row) =>
        row.runningBalance == null ? '—' : String(row.runningBalance),
    },
    {
      field: 'reference',
      headerName: 'Reference',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => {
        const link = resolveStockLedgerTransactionLink(
          params.row.referenceType,
          params.row.referenceId,
        );
        const label = formatReferenceLabel(
          params.row.referenceType,
          params.row.referenceId,
        );
        if (!link) {
          return (
            <Typography variant="body2" noWrap title={label}>
              {label}
            </Typography>
          );
        }
        return (
          <Link
            component={RouterLink}
            to={link.to}
            underline="hover"
            variant="body2"
            data-testid="stock-ledger-txn-link"
          >
            {link.label}
          </Link>
        );
      },
    },
  ];

  return (
    <DataTable<StockLedgerRow>
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
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search transaction number…"
      filterSlot={filterSlot}
      emptyTitle="No stock movements"
      emptyDescription="No immutable ledger entries match the current project and filters."
      preferencesKey="stock-ledger-list"
    />
  );
}
