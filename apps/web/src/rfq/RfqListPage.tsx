import { useMemo, useState } from 'react';
import { Button, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { formatDate } from '@/format';
import { CreateRfqDialog } from './CreateRfqDialog';
import { resolveRfqCapabilities } from './roleAccess';
import type { PublicRfq } from './types';
import { useRfqsList } from './useRfqs';
import { PageHeader } from '@/layouts/PageHeader';

/**
 * RFQ list — Nest `GET /rfqs` (`quotation.view`).
 */
export function RfqListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveRfqCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);

  const list = useRfqsList(
    {
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
    },
    caps.canView && Boolean(selectedProjectId),
  );

  const columns = useMemo<GridColDef<PublicRfq>[]>(
    () => [
      {
        field: 'rfqNumber',
        headerName: 'RFQ #',
        width: 140,
        renderCell: (params) => (
          <Button
            component={RouterLink}
            to={`/procurement/rfqs/${params.row.id}`}
            size="small"
            sx={{ px: 0, minWidth: 0, textTransform: 'none' }}
            data-testid={`rfq-link-${params.row.id}`}
          >
            {params.row.rfqNumber}
          </Button>
        ),
      },
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
        field: 'vendorIds',
        headerName: 'Vendors',
        width: 100,
        valueGetter: (_v, row) => row.vendorIds.length,
      },
      {
        field: 'closingDate',
        headerName: 'Closing',
        width: 120,
        valueGetter: (_v, row) => formatDate(row.closingDate),
      },
      {
        field: 'purchaseRequestId',
        headerName: 'PR',
        width: 120,
        renderCell: (params) => (
          <Button
            component={RouterLink}
            to={`/procurement/purchase-requests/${params.row.purchaseRequestId}`}
            size="small"
            sx={{ px: 0, minWidth: 0, textTransform: 'none' }}
          >
            View PR
          </Button>
        ),
      },
    ],
    [],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="RFQs unavailable"
        message="You need quotation.view to open RFQs."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list RFQs."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="rfq-list-page">
      <PageHeader
        subtitle="Request-for-quotation drafts and issued invites for this project."
        actions={
          caps.canManage ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Create from PR
            </Button>
          ) : undefined
        }
      />

      <DataTable<PublicRfq>
        title="RFQs"
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle="No RFQs"
        emptyDescription="Create an RFQ from an approved purchase request."
        height={520}
        getRowId={(row) => row.id}
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        preferencesKey="rfq-list"
        rowActions={[
          {
            id: 'open',
            label: 'Open',
            onClick: (row) => navigate(`/procurement/rfqs/${row.id}`),
          },
        ]}
      />

      <CreateRfqDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/procurement/rfqs/${id}`)}
      />
    </Stack>
  );
}
