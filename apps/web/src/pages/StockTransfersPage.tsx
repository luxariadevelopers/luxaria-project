import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import {
  CreateStockTransferDrawer,
  canPostStockTransfer,
  listStockTransfers,
  postStockTransfer,
  stockTransferScopeLabel,
  stockTransferStatusLabel,
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

  const handlePost = (id: string) => {
    void (async () => {
      try {
        const row = await post.mutateAsync(id);
        success(`Transfer ${row.transferNumber} posted`);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Stack spacing={2} data-testid="stock-transfers-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Stock Transfers</Typography>
          <Typography variant="body2" color="text.secondary">
            Warehouse / site / project transfers. Posting updates both source
            and destination ledger rows.
          </Typography>
        </Stack>
        {canCreate ? (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New transfer
          </Button>
        ) : null}
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Transfer #</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Status</TableCell>
              {canPost ? <TableCell align="right">Actions</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canPost ? 6 : 5}>
                  <Typography variant="body2" color="text.secondary">
                    No transfers yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.transferNumber}</TableCell>
                  <TableCell>{stockTransferScopeLabel(row.scope)}</TableCell>
                  <TableCell>{row.sourceLocation || '—'}</TableCell>
                  <TableCell>{row.destLocation || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={stockTransferStatusLabel(row.status)}
                    />
                  </TableCell>
                  {canPost ? (
                    <TableCell align="right">
                      {canPostStockTransfer(row.status) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={post.isPending}
                          onClick={() => handlePost(row.id)}
                        >
                          Post
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

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
