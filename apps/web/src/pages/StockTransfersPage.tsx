import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  CreateStockTransferDrawer,
  canPostStockTransfer,
  listStockTransfers,
  postStockTransfer,
  stockTransferScopeLabel,
  stockTransferStatusLabel,
  type StockTransfer,
} from '@/stock-transfers';

export function StockTransfersPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const canView = hasPermission('stock.view');
  const canCreate = hasPermission('stock.transfer');
  const canPost = hasPermission('stock.adjust');

  const queryKey = ['stock-transfers', selectedProjectId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => listStockTransfers(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const post = useMutation({
    mutationFn: (id: string) => postStockTransfer(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const handlePost = (row: StockTransfer) => {
    void (async () => {
      try {
        const posted = await post.mutateAsync(row.id);
        success(`Transfer ${posted.transferNumber} posted`);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  const columns = useMemo<GridColDef<StockTransfer>[]>(
    () => [
      {
        field: 'transferNumber',
        headerName: 'Transfer #',
        width: 150,
      },
      {
        field: 'scope',
        headerName: 'Scope',
        width: 140,
        valueGetter: (_v, row) => stockTransferScopeLabel(row.scope),
      },
      {
        field: 'sourceLocation',
        headerName: 'From',
        flex: 1,
        minWidth: 120,
        valueGetter: (_v, row) => row.sourceLocation || '—',
      },
      {
        field: 'destLocation',
        headerName: 'To',
        flex: 1,
        minWidth: 120,
        valueGetter: (_v, row) => row.destLocation || '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        valueGetter: (_v, row) => stockTransferStatusLabel(row.status),
        renderCell: (params) => (
          <Chip
            size="small"
            label={stockTransferStatusLabel(params.row.status)}
          />
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo<DataTableRowAction<StockTransfer>[]>(() => {
    if (!canPost) return [];
    return [
      {
        id: 'post',
        label: 'Post',
        onClick: handlePost,
        disabled: (row) =>
          !canPostStockTransfer(row.status) || post.isPending,
      },
    ];
  }, [canPost, post.isPending]);

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view transfers.</Alert>;
  }
  if (query.isError) {
    return (
      <RetryPanel
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2} data-testid="stock-transfers-page">
      <PageHeader
        subtitle="Warehouse / site / project transfers. Posting updates both source and destination ledger rows."
        actions={
          canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New transfer
            </Button>
          ) : undefined
        }
      />

      <DataTable
        title="Stock transfers"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No transfers"
        emptyDescription="No transfers yet."
        height={520}
        paginationMode="client"
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        mobileCard={{
          primaryField: 'transferNumber',
          metaFields: ['scope', 'sourceLocation'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      {canCreate ? (
        <CreateStockTransferDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={selectedProjectId}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey });
          }}
        />
      ) : null}
    </Stack>
  );
}
