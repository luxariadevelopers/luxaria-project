import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import {
  formatDate,
  formatInr,
  paymentModeLabel,
  sourceTypeLabel,
} from './labels';
import { ReceiptStatusChip } from './ReceiptStatusChip';
import type { CustomerReceiptCapabilities } from './roleAccess';
import type { PublicCustomerReceipt } from './types';
import {
  canCancelReceipt,
  canOpenReceiptPdf,
  canPostReceipt,
} from './workflowActions';

type Props = {
  rows: readonly PublicCustomerReceipt[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  toolbar?: ReactNode;
  caps: CustomerReceiptCapabilities;
  onPost?: (row: PublicCustomerReceipt) => void;
  onCancel?: (row: PublicCustomerReceipt) => void;
  onProof?: (row: PublicCustomerReceipt) => void;
};

export function ReceiptTable({
  rows,
  loading,
  error,
  onRetry,
  emptyMessage = 'No collections yet.',
  toolbar,
  caps,
  onPost,
  onCancel,
  onProof,
}: Props) {
  const columns: GridColDef<PublicCustomerReceipt>[] = [
    { field: 'receiptNumber', headerName: 'Receipt', width: 140 },
    {
      field: 'receiptDate',
      headerName: 'Date',
      width: 110,
      valueGetter: (_v, row) => formatDate(row.receiptDate),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.amount),
    },
    {
      field: 'allocatedAmount',
      headerName: 'Allocated',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.allocatedAmount),
    },
    {
      field: 'unallocatedAmount',
      headerName: 'Advance',
      width: 120,
      valueGetter: (_v, row) => formatInr(row.unallocatedAmount),
    },
    {
      field: 'paymentMode',
      headerName: 'Mode',
      width: 120,
      valueGetter: (_v, row) => paymentModeLabel(row.paymentMode),
    },
    {
      field: 'sourceType',
      headerName: 'Source',
      width: 130,
      valueGetter: (_v, row) => sourceTypeLabel(row.sourceType),
    },
    {
      field: 'transactionReference',
      headerName: 'Txn ref',
      width: 140,
      valueGetter: (_v, row) => row.transactionReference ?? '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <ReceiptStatusChip status={params.row.status} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 260,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row;
        return (
          <Stack direction="row" spacing={0.5}>
            {onPost && canPostReceipt(row, caps) ? (
              <Button size="small" onClick={() => onPost(row)}>
                Post
              </Button>
            ) : null}
            {onProof && canOpenReceiptPdf(row) ? (
              <Button size="small" onClick={() => onProof(row)}>
                PDF
              </Button>
            ) : onProof ? (
              <Button size="small" onClick={() => onProof(row)}>
                Proof
              </Button>
            ) : null}
            {onCancel && canCancelReceipt(row, caps) ? (
              <Button size="small" color="inherit" onClick={() => onCancel(row)}>
                Cancel
              </Button>
            ) : null}
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={1.5} data-testid="receipt-table">
      {toolbar}
      {error ? (
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        >
          Failed to load collections.
        </Alert>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <Box sx={{ py: 2 }}>
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Box>
      ) : null}
      <DataTable
        title="Collections"
        rows={[...rows]}
        columns={columns}
        loading={loading}
        height={480}
        getRowId={(row) => row.id}
        mobileCard={{
          primaryField: 'receiptNumber',
          metaFields: ['amount', 'receiptDate'],
          statusField: 'status',
        }}
      />
    </Stack>
  );
}
