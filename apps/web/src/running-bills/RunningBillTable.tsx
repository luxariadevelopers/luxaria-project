import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { formatInr } from '@/format';
import { formatBillingPeriod, raNumberLabel } from './labels';
import { RunningBillStatusChip } from './RunningBillStatusChip';
import type { PublicContractorBill } from './types';

type Props = {
  rows: readonly PublicContractorBill[];
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
  contractorLabel: (contractorId: string) => string;
  onOpen: (row: PublicContractorBill) => void;
};

export function RunningBillTable({
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
  contractorLabel,
  onOpen,
}: Props) {
  const columns: GridColDef<PublicContractorBill>[] = [
    {
      field: 'billNumber',
      headerName: 'Bill',
      width: 150,
    },
    {
      field: 'raNumber',
      headerName: 'RA',
      width: 90,
      valueGetter: (_v, row) => raNumberLabel(row.raNumber),
    },
    {
      field: 'contractorId',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => contractorLabel(row.contractorId),
    },
    {
      field: 'billingPeriod',
      headerName: 'Billing period',
      width: 200,
      valueGetter: (_v, row) =>
        formatBillingPeriod(row.billingPeriod.from, row.billingPeriod.to),
    },
    {
      field: 'currentCertifiedValue',
      headerName: 'Certified',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_v, row) => formatInr(row.currentCertifiedValue),
    },
    {
      field: 'deductions',
      headerName: 'Deductions',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      valueGetter: (_v, row) =>
        formatInr(
          row.advanceRecovery +
            row.materialRecovery +
            row.retention +
            row.tds +
            row.penalty +
            row.otherDeductions,
        ),
    },
    {
      field: 'netPayable',
      headerName: 'Payable',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_v, row) => formatInr(row.netPayable),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => (
        <RunningBillStatusChip status={params.row.status} />
      ),
    },
  ];

  return (
    <DataTable
      rows={[...rows]}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search bill number…"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      title="Running bills"
      paginationMode="server"
      preferencesKey="running-bills-list"
      height={520}
      onRowClick={(params) => onOpen(params.row)}
      emptyTitle="No running bills"
      emptyDescription="Create a contractor RA claim from verified measurements."
    />
  );
}
