import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {
  Button,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { useAuth } from '@/auth/AuthContext';
import { resolveReceiptDownload } from './documentDownload';
import { resolveInvestorPortalCapabilities } from './roleAccess';
import type { AggregatedInvestorStatement } from './types';

type Props = {
  rows: AggregatedInvestorStatement[];
};

function formatAmount(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

export function InvestorReceiptDownloads({ rows }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveInvestorPortalCapabilities(hasPermission);
  const receiptRows = rows.filter((row) => row.kind === 'receipt');

  const columns: GridColDef<AggregatedInvestorStatement>[] = [
    {
      field: 'projectCode',
      headerName: 'Project',
      width: 120,
    },
    {
      field: 'title',
      headerName: 'Receipt no.',
      width: 150,
    },
    {
      field: 'receivedDate',
      headerName: 'Received',
      width: 120,
      valueGetter: (_v, row) =>
        row.receivedDate ? row.receivedDate.slice(0, 10) : '—',
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 130,
      valueFormatter: (value: number | null) => formatAmount(value),
    },
    {
      field: 'paymentMode',
      headerName: 'Mode',
      width: 130,
      valueGetter: (_v, row) => row.paymentMode ?? '—',
    },
    {
      field: 'hasDocument',
      headerName: 'Document',
      width: 120,
      renderCell: ({ row }) => (
        <Chip
          size="small"
          label={row.hasDocument ? 'On file' : 'None'}
          color={row.hasDocument ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'download',
      headerName: 'Download',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        const resolution = resolveReceiptDownload(
          row.hasDocument,
          caps.canDownloadS3Documents,
        );
        return (
          <Tooltip title={resolution.reason ?? 'Not available'}>
            <span>
              <Button
                size="small"
                disabled={!resolution.canDownload}
                startIcon={<DownloadOutlinedIcon />}
              >
                Download
              </Button>
            </span>
          </Tooltip>
        );
      },
    },
  ];

  if (receiptRows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No contribution receipts in your authorised projects yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2} data-testid="investor-receipt-downloads">
      <Typography variant="subtitle1">Contribution receipts</Typography>
      <Typography variant="body2" color="text.secondary">
        Posted receipts from portal project detail. There is no investor-portal
        receipt download endpoint; local upload paths are not fetched via staff
        APIs.
      </Typography>
      <DataTable
        title="Receipts"
        rows={receiptRows}
        columns={columns}
        height={360}
        getRowId={(row) => row.id}
      />
    </Stack>
  );
}
