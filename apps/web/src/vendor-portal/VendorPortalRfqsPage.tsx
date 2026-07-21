import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate } from '@/format';
import { fetchVendorPortalRfqs, type VendorPortalRfq } from './api';

/**
 * Thin vendor portal RFQ list — Nest `GET /vendor-portal/rfqs`.
 * Reuses staff auth; vendor must be linked via `Vendor.userId`.
 */
export function VendorPortalRfqsPage() {
  const { hasPermission, access } = useAuth();
  const canView = hasPermission('vendor_portal.view');

  const list = useQuery({
    queryKey: ['vendor-portal', 'rfqs'],
    queryFn: () => fetchVendorPortalRfqs(),
    enabled: Boolean(access) && canView,
    staleTime: 15_000,
    retry: false,
  });

  const columns: GridColDef<VendorPortalRfq>[] = [
    { field: 'rfqNumber', headerName: 'RFQ #', width: 140 },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 180 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip size="small" label={params.row.status} variant="outlined" />
      ),
    },
    {
      field: 'closingDate',
      headerName: 'Closing',
      width: 130,
      valueGetter: (_v, row) => formatDate(row.closingDate),
    },
  ];

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Vendor portal unavailable"
        message="You need vendor_portal.view and a linked vendor user account."
      />
    );
  }

  if (list.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (list.error) {
    return (
      <RetryPanel
        error={list.error}
        onRetry={() => void list.refetch()}
        forceRetry
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="vendor-portal-rfqs-page">
      <Typography color="text.secondary">
        Issued RFQs where your vendor account is invited. Respond via quotations
        in the staff quotation entry (or portal respond API).
      </Typography>
      <DataTable<VendorPortalRfq>
        title="Invited RFQs"
        rows={list.data ?? []}
        columns={columns}
        loading={list.isFetching}
        emptyTitle="No invited RFQs"
        emptyDescription="Issued RFQs that include your vendor will appear here."
        height={420}
        getRowId={(row) => row.id}
        paginationMode="client"
        preferencesKey="vendor-portal-rfqs"
      />
    </Stack>
  );
}
