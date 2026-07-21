import { useQuery } from '@tanstack/react-query';
import {
  Alert,
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
import { useParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import {
  fetchWorkOrder,
  fetchWorkOrderAmendments,
} from '@/work-orders/api';

/**
 * Work order detail stub — revision history + amendments.
 * Wire as `/work-orders/:id` (see CTR-INTEGRATION.md). Permission: `work_order.view`.
 */
export function WorkOrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const canView = hasPermission('work_order.view');

  const detailQuery = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => fetchWorkOrder(id),
    enabled: canView && Boolean(id),
  });

  const amendmentsQuery = useQuery({
    queryKey: ['work-order-amendments', id],
    queryFn: () => fetchWorkOrderAmendments(id),
    enabled: canView && Boolean(id),
  });

  if (!canView) return <PermissionDenied />;
  if (!id) {
    return <Alert severity="info">Missing work order id.</Alert>;
  }
  if (detailQuery.isError) {
    return <RetryPanel onRetry={() => void detailQuery.refetch()} />;
  }

  const wo = detailQuery.data;
  const amendments = amendmentsQuery.data ?? [];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h5">
          {wo?.workOrderNumber ?? 'Work order'}
        </Typography>
        {wo ? (
          <Chip
            size="small"
            label={wo.status.replaceAll('_', ' ')}
            color="info"
          />
        ) : null}
      </Stack>

      {detailQuery.isLoading || !wo ? (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active commercial (revision {wo.activeRevision})
            </Typography>
            <Typography variant="body2">
              Value: {wo.contractValue.toLocaleString()} · Lines:{' '}
              {wo.boqScopeLines.length} · Locations: {wo.locations.join(', ') || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {wo.startDate.slice(0, 10)} → {wo.endDate.slice(0, 10)}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Frozen revision history
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Append-only. Approved commercial snapshots are never overwritten.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rev</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Terms</TableCell>
                  <TableCell>Frozen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {wo.revisions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No frozen revisions yet (approve WO to freeze r1).
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  wo.revisions.map((rev) => (
                    <TableRow key={rev.revision}>
                      <TableCell>r{rev.revision}</TableCell>
                      <TableCell>
                        {rev.contractValue.toLocaleString()}
                      </TableCell>
                      <TableCell>{rev.terms ?? '—'}</TableCell>
                      <TableCell>
                        {rev.frozenAt ? rev.frozenAt.slice(0, 10) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Amendments
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Number</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Target rev</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {amendmentsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        Loading…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : amendments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No amendments.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  amendments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.amendmentNumber}</TableCell>
                      <TableCell>{a.type.replaceAll('_', ' ')}</TableCell>
                      <TableCell>r{a.targetRevision}</TableCell>
                      <TableCell>{a.status.replaceAll('_', ' ')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Stack>
  );
}
