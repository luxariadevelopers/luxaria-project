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
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { listMaterialReconciliations } from '@/contractor-material-reconciliation/api';

function statusColor(
  status: string,
): 'default' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'draft':
      return 'warning';
    case 'approved':
      return 'info';
    case 'posted_to_bill':
      return 'success';
    default:
      return 'default';
  }
}

function formatQty(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';
}

function formatMoney(n: number): string {
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '—';
}

export function MaterialReconciliationPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('contractor_recovery.view');

  const query = useQuery({
    queryKey: ['material-reconciliations', selectedProjectId],
    queryFn: () =>
      listMaterialReconciliations({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">
        Select a project to view material reconciliations.
      </Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Material Reconciliation</Typography>
      <Typography variant="body2" color="text.secondary">
        Issued − Theoretical − Approved wastage − Returned = Recoverable
        difference. Positive difference becomes a material recovery on the
        contractor bill.
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell align="right">Issued</TableCell>
              <TableCell align="right">Theoretical</TableCell>
              <TableCell align="right">Wastage</TableCell>
              <TableCell align="right">Returned</TableCell>
              <TableCell align="right">Recoverable</TableCell>
              <TableCell align="right">Recovery ₹</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No material reconciliations for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.period.from.slice(0, 10)} → {row.period.to.slice(0, 10)}
                  </TableCell>
                  <TableCell align="right">
                    {formatQty(row.issuedQuantity)}
                  </TableCell>
                  <TableCell align="right">
                    {formatQty(row.theoreticalConsumption)}
                  </TableCell>
                  <TableCell align="right">
                    {formatQty(row.approvedWastage)}
                  </TableCell>
                  <TableCell align="right">
                    {formatQty(row.returnedQuantity)}
                  </TableCell>
                  <TableCell align="right">
                    {formatQty(row.recoverableDifference)}
                  </TableCell>
                  <TableCell align="right">
                    {formatMoney(row.recoveryAmount)}
                  </TableCell>
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
