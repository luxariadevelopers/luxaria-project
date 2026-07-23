import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { formatDate, formatInr } from '@/format';
import { ContributionReceiptStatusChip } from './ContributionReceiptStatusChip';
import { paymentModeLabel } from './labels';
import type { ContributionReceiptCapabilities } from './roleAccess';
import type { PublicContributionReceipt } from './types';
import { resolveReceiptRowActions } from './workflowActions';

type Props = {
  rows: readonly PublicContributionReceipt[];
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
  caps: ContributionReceiptCapabilities;
  participantLabel: (id: string) => string;
  commitmentLabel: (id: string) => string;
  onSubmit?: (row: PublicContributionReceipt) => void;
  onVerify?: (row: PublicContributionReceipt) => void;
  onPost?: (row: PublicContributionReceipt) => void;
  onCancel?: (row: PublicContributionReceipt) => void;
  onDocuments?: (row: PublicContributionReceipt) => void;
  onDownloadPdf?: (row: PublicContributionReceipt) => void;
};

export function ContributionReceiptTable({
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
  participantLabel,
  commitmentLabel,
  onSubmit,
  onVerify,
  onPost,
  onCancel,
  onDocuments,
  onDownloadPdf,
}: Props) {
  const columns: GridColDef<PublicContributionReceipt>[] = [
    {
      field: 'receiptNumber',
      headerName: 'Number',
      width: 150,
    },
    {
      field: 'participantId',
      headerName: 'Participant',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => participantLabel(row.participantId),
    },
    {
      field: 'commitmentId',
      headerName: 'Commitment',
      width: 150,
      valueGetter: (_v, row) => commitmentLabel(row.commitmentId),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.amount),
    },
    {
      field: 'paymentMode',
      headerName: 'Mode',
      width: 130,
      valueGetter: (_v, row) => paymentModeLabel(row.paymentMode),
    },
    {
      field: 'transactionReference',
      headerName: 'Txn ref',
      width: 140,
      valueGetter: (_v, row) => row.transactionReference ?? '—',
    },
    {
      field: 'receivedDate',
      headerName: 'Received',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.receivedDate),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <ContributionReceiptStatusChip status={params.row.status} />
      ),
    },
  ];

  const rowActions: DataTableRowAction<PublicContributionReceipt>[] = [];

  if (onSubmit && caps.canSubmit) {
    rowActions.push({
      id: 'submit',
      label: 'Submit',
      onClick: onSubmit,
      disabled: (row) =>
        !resolveReceiptRowActions(row, caps).includes('submit'),
    });
  }
  if (onVerify && caps.canVerify) {
    rowActions.push({
      id: 'verify',
      label: 'Verify',
      onClick: onVerify,
      disabled: (row) =>
        !resolveReceiptRowActions(row, caps).includes('verify'),
    });
  }
  if (onPost && caps.canPost) {
    rowActions.push({
      id: 'post',
      label: 'Post',
      onClick: onPost,
      disabled: (row) => !resolveReceiptRowActions(row, caps).includes('post'),
    });
  }
  if (onDocuments) {
    rowActions.push({
      id: 'documents',
      label: 'Documents / PDF',
      onClick: onDocuments,
      disabled: (row) => {
        const actions = resolveReceiptRowActions(row, caps);
        return (
          !actions.includes('documents') && !actions.includes('download_pdf')
        );
      },
    });
  }
  if (onDownloadPdf) {
    rowActions.push({
      id: 'download_pdf',
      label: 'Download PDF',
      onClick: onDownloadPdf,
      disabled: (row) =>
        !resolveReceiptRowActions(row, caps).includes('download_pdf'),
    });
  }
  if (onCancel && caps.canCancel) {
    rowActions.push({
      id: 'cancel',
      label: 'Cancel',
      danger: true,
      onClick: onCancel,
      disabled: (row) =>
        !resolveReceiptRowActions(row, caps).includes('cancel'),
    });
  }

  return (
    <DataTable
      title="Contribution receipts"
      rows={[...rows]}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle="No contribution receipts"
      emptyDescription="Create a funding receipt or adjust filters."
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
      searchPlaceholder="Search receipt number…"
      preferencesKey="contribution-receipts-list"
      mobileCard={{
        primaryField: 'receiptNumber',
        metaFields: ['amount', 'receivedDate'],
        statusField: 'status',
      }}
      filterSlot={filterSlot}
      toolbarActions={toolbarActions}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
    />
  );
}
