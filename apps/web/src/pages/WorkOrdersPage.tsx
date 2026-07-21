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
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { fetchWorkOrders, type WorkOrderStatus } from '@/work-orders/api';

function statusColor(
  status: WorkOrderStatus,
): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'draft':
      return 'default';
    case 'pending_approval':
      return 'warning';
    case 'approved':
    case 'issued':
      return 'info';
    case 'accepted':
    case 'in_progress':
    case 'partially_completed':
      return 'info';
    case 'completed':
    case 'closed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Work orders list stub — wire route under Contractor / Project Control.
 * Permission: `work_order.view` (see CTR-INTEGRATION.md).
 */
export function WorkOrdersPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('work_order.view');

  const query = useQuery({
    queryKey: ['work-orders', selectedProjectId],
    queryFn: () => fetchWorkOrders({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view work orders.</Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Work Orders</Typography>
      <Typography variant="body2" color="text.secondary">
        Contractor work orders with immutable commercial revisions. Amendments
        never overwrite an approved snapshot silently.
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Number</TableCell>
              <TableCell>Revision</TableCell>
              <TableCell>Contractor</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No work orders yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography
                      component={RouterLink}
                      to={`./${row.id}`}
                      variant="body2"
                      color="primary"
                      sx={{ textDecoration: 'none' }}
                    >
                      {row.workOrderNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>r{row.activeRevision}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {row.contractorId.slice(-6)}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.contractValue.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status.replaceAll('_', ' ')}
                      color={statusColor(row.status)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
