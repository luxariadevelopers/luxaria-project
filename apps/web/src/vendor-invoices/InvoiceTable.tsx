import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { InvoiceStatusChip } from './InvoiceStatusChip';
import { MatchingStatusChip } from './MatchingStatusChip';
import type { VendorInvoiceCapabilities } from './roleAccess';
import type { PublicVendorInvoice } from './types';
import { resolveVendorInvoiceActions } from './workflowActions';

type Props = {
  rows: readonly PublicVendorInvoice[];
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
  caps: VendorInvoiceCapabilities;
  vendorLabel: (vendorId: string) => string;
  onEdit?: (row: PublicVendorInvoice) => void;
  onSubmit?: (row: PublicVendorInvoice) => void;
  onVerify?: (row: PublicVendorInvoice) => void;
  onOpenMatch?: (row: PublicVendorInvoice) => void;
  onCancel?: (row: PublicVendorInvoice) => void;
  onUpload?: (row: PublicVendorInvoice) => void;
  onOpen?: (row: PublicVendorInvoice) => void;
};

export function InvoiceTable({
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
  caps,
  vendorLabel,
  onEdit,
  onSubmit,
  onVerify,
  onOpenMatch,
  onCancel,
  onUpload,
  onOpen,
}: Props) {
  const columns: GridColDef<PublicVendorInvoice>[] = [
    {
      field: 'documentNumber',
      headerName: 'Document',
      width: 140,
    },
    {
      field: 'invoiceNumber',
      headerName: 'Vendor inv #',
      width: 140,
    },
    {
      field: 'vendorId',
      headerName: 'Vendor',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => vendorLabel(row.vendorId),
    },
    {
      field: 'invoiceDate',
      headerName: 'Invoice date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.invoiceDate),
    },
    {
      field: 'dueDate',
      headerName: 'Due date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.dueDate),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.totalAmount),
    },
    {
      field: 'remainingPayable',
      headerName: 'Payable',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.remainingPayable),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <InvoiceStatusChip status={params.row.status} />,
    },
    {
      field: 'matchingStatus',
      headerName: 'Match',
      width: 150,
      renderCell: (params) => (
        <MatchingStatusChip status={params.row.matchingStatus} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicVendorInvoice>[] = [];

  if (onOpen) {
    rowActions.push({ id: 'open', label: 'Open', onClick: onOpen });
  }
  if (onEdit && caps.canCreate) {
    rowActions.push({
      id: 'edit',
      label: 'Edit draft',
      onClick: onEdit,
      disabled: (row) =>
        !resolveVendorInvoiceActions(row, caps).includes('edit'),
    });
  }
  if (onUpload && caps.canUploadDocument) {
    rowActions.push({
      id: 'upload',
      label: 'Attach scan',
      onClick: onUpload,
      disabled: (row) =>
        !resolveVendorInvoiceActions(row, caps).includes('upload_document'),
    });
  }
  if (onSubmit && caps.canSubmit) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveVendorInvoiceActions(row, caps).includes('submit'),
    });
  }
  if (onVerify && caps.canVerify) {
    rowActions.push({
      id: 'verify',
      label: 'Verify',
      onClick: onVerify,
      disabled: (row) =>
        !resolveVendorInvoiceActions(row, caps).includes('verify'),
    });
  }
  if (onOpenMatch && (caps.canMatch || caps.canApprove || caps.canView)) {
    rowActions.push({
      id: 'match',
      label: 'Three-way match',
      onClick: onOpenMatch,
      disabled: (row) => {
        const allowed = resolveVendorInvoiceActions(row, caps);
        return (
          !allowed.includes('match') &&
          !allowed.includes('reject_matching') &&
          !allowed.includes('approve') &&
          row.status !== 'matching' &&
          row.status !== 'verification' &&
          row.status !== 'approval' &&
          row.status !== 'posted'
        );
      },
    });
  }
  if (onCancel && caps.canCreate) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      danger: true,
      onClick: onCancel,
      disabled: (row) =>
        !resolveVendorInvoiceActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Vendor invoices"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No vendor invoices"
      emptyDescription="Capture a vendor invoice against a PO and accepted GRNs."
      height={520}
      getRowId={(row) => row.id}
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      rowCount={rowCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search invoice # / document #"
      preferencesKey="vendor-invoices-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={onOpen ? (params) => onOpen(params.row) : undefined}
    />
  );
}
