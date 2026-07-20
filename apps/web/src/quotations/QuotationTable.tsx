import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { QuotationStatusChip } from './QuotationStatusChip';
import type { QuotationCapabilities } from './roleAccess';
import type { PublicVendorQuotation } from './types';
import { resolveQuotationRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicVendorQuotation[];
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
  caps: QuotationCapabilities;
  vendorLabel: (vendorId: string) => string;
  onEdit?: (row: PublicVendorQuotation) => void;
  onSubmit?: (row: PublicVendorQuotation) => void;
  onRevise?: (row: PublicVendorQuotation) => void;
  onFinalise?: (row: PublicVendorQuotation) => void;
  onCancel?: (row: PublicVendorQuotation) => void;
  onUpload?: (row: PublicVendorQuotation) => void;
  onOpen?: (row: PublicVendorQuotation) => void;
  /** Nest `purchase.order` — generate PO from submitted/final quotation. */
  canCreatePurchaseOrder?: boolean;
  onCreatePurchaseOrder?: (row: PublicVendorQuotation) => void;
};

export function QuotationTable({
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
  onRevise,
  onFinalise,
  onCancel,
  onUpload,
  onOpen,
  canCreatePurchaseOrder = false,
  onCreatePurchaseOrder,
}: Props) {
  const columns: GridColDef<PublicVendorQuotation>[] = [
    {
      field: 'quotationNumber',
      headerName: 'Number',
      width: 150,
    },
    {
      field: 'revisionNumber',
      headerName: 'Rev',
      width: 70,
      type: 'number',
    },
    {
      field: 'vendorId',
      headerName: 'Vendor',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => vendorLabel(row.vendorId),
    },
    {
      field: 'purchaseRequestId',
      headerName: 'PR id',
      width: 110,
      valueGetter: (_v, row) => row.purchaseRequestId.slice(-8),
    },
    {
      field: 'quotationDate',
      headerName: 'Quote date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.quotationDate),
    },
    {
      field: 'validityDate',
      headerName: 'Valid until',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.validityDate),
    },
    {
      field: 'grandTotal',
      headerName: 'Grand total',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.grandTotal),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <QuotationStatusChip status={params.row.status} />,
    },
  ];

  const rowActions: DataTableRowAction<PublicVendorQuotation>[] = [];

  if (onOpen) {
    rowActions.push({ id: 'open', label: 'View', onClick: onOpen });
  }
  if (onEdit && caps.canManage) {
    rowActions.push({
      id: 'edit',
      label: 'Edit draft',
      onClick: onEdit,
      disabled: (row) =>
        !resolveQuotationRowActions(row, caps).includes('edit'),
    });
  }
  if (onSubmit && caps.canManage) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveQuotationRowActions(row, caps).includes('submit'),
    });
  }
  if (onRevise && caps.canManage) {
    rowActions.push({
      id: 'revise',
      label: 'Revise',
      onClick: onRevise,
      disabled: (row) =>
        !resolveQuotationRowActions(row, caps).includes('revise'),
    });
  }
  if (onFinalise && caps.canFinalize) {
    rowActions.push({
      id: 'finalise',
      label: 'Mark final',
      onClick: onFinalise,
      disabled: (row) =>
        !resolveQuotationRowActions(row, caps).includes('finalise'),
    });
  }
  if (onUpload && caps.canManage) {
    rowActions.push({
      id: 'upload',
      label: 'Upload document',
      onClick: onUpload,
      disabled: (row) =>
        !resolveQuotationRowActions(row, caps).includes('upload'),
    });
  }
  if (onCancel && caps.canManage) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      danger: true,
      onClick: onCancel,
      disabled: (row) =>
        !resolveQuotationRowActions(row, caps).includes('cancel'),
    });
  }
  if (onCreatePurchaseOrder && canCreatePurchaseOrder) {
    rowActions.push({
      id: 'create_po',
      label: 'Create PO',
      onClick: onCreatePurchaseOrder,
      disabled: (row) =>
        !resolveQuotationRowActions(row, caps, {
          canCreatePurchaseOrder,
        }).includes('create_po'),
    });
  }

  return (
    <DataTable
      title="Vendor quotations"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No vendor quotations"
      emptyDescription="Capture quotations against an approved or sourcing purchase request."
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
      searchPlaceholder="Search quotation number…"
      preferencesKey="vendor-quotations-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={onOpen ? (params) => onOpen(params.row) : undefined}
    />
  );
}
