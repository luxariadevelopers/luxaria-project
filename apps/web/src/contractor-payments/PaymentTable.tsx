import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { paymentModeLabel } from './labels';
import { PaymentStatusChip } from './PaymentStatusChip';
import type { ContractorPaymentCapabilities } from './roleAccess';
import type { PublicContractorPayment } from './types';
import { resolveContractorPaymentActions } from './workflowActions';

type Props = {
  rows: readonly PublicContractorPayment[];
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
  caps: ContractorPaymentCapabilities;
  contractorLabel: (contractorId: string) => string;
  onEdit?: (row: PublicContractorPayment) => void;
  onSubmit?: (row: PublicContractorPayment) => void;
  onApprove?: (row: PublicContractorPayment) => void;
  onRelease?: (row: PublicContractorPayment) => void;
  onVerify?: (row: PublicContractorPayment) => void;
  onPost?: (row: PublicContractorPayment) => void;
  onCancel?: (row: PublicContractorPayment) => void;
  onUploadProof?: (row: PublicContractorPayment) => void;
  onOpen?: (row: PublicContractorPayment) => void;
};

export function PaymentTable({
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
  contractorLabel,
  onEdit,
  onSubmit,
  onApprove,
  onRelease,
  onVerify,
  onPost,
  onCancel,
  onUploadProof,
  onOpen,
}: Props) {
  const columns: GridColDef<PublicContractorPayment>[] = [
    {
      field: 'paymentNumber',
      headerName: 'Payment #',
      width: 150,
    },
    {
      field: 'contractorId',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => contractorLabel(row.contractorId),
    },
    {
      field: 'paymentDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.paymentDate),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.amount),
    },
    {
      field: 'bankAmount',
      headerName: 'Bank',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.bankAmount),
    },
    {
      field: 'paymentMode',
      headerName: 'Mode',
      width: 120,
      valueGetter: (_v, row) => paymentModeLabel(row.paymentMode),
    },
    {
      field: 'transactionReference',
      headerName: 'Txn ref',
      width: 140,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <PaymentStatusChip status={params.row.status} />,
    },
  ];

  const rowActions: DataTableRowAction<PublicContractorPayment>[] = [];

  if (onOpen) {
    rowActions.push({ id: 'open', label: 'Open', onClick: onOpen });
  }
  if (onEdit && caps.canCreate) {
    rowActions.push({
      id: 'edit',
      label: 'Edit draft',
      onClick: onEdit,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('edit'),
    });
  }
  if (onUploadProof && caps.canUploadDocument) {
    rowActions.push({
      id: 'proof',
      label: 'Attach proof',
      onClick: onUploadProof,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('upload_proof'),
    });
  }
  if (onSubmit && caps.canSubmit) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('submit'),
    });
  }
  if (onApprove && caps.canApprove) {
    rowActions.push({
      id: 'approve',
      label: 'Approve',
      onClick: onApprove,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('approve'),
    });
  }
  if (onRelease && caps.canBankRelease) {
    rowActions.push({
      id: 'release',
      label: 'Record bank release',
      onClick: onRelease,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('release'),
    });
  }
  if (onVerify && caps.canVerify) {
    rowActions.push({
      id: 'verify',
      label: 'Verify',
      onClick: onVerify,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('verify'),
    });
  }
  if (onPost && caps.canPost) {
    rowActions.push({
      id: 'post',
      label: 'Post journal',
      onClick: onPost,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('post'),
    });
  }
  if (onCancel && caps.canCancel) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      danger: true,
      onClick: onCancel,
      disabled: (row) =>
        !resolveContractorPaymentActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Contractor payments"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No contractor payments"
      emptyDescription="Allocate payments against posted running bills."
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
      searchPlaceholder="Search payment # / txn ref"
      preferencesKey="contractor-payments-list"
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      onRowClick={onOpen ? (params) => onOpen(params.row) : undefined}
    />
  );
}
