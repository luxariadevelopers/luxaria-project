import { useQuery } from '@tanstack/react-query';
import {
  Alert,
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
import {
  fetchReorderReport,
  fetchValuationReport,
} from '@/inventory-reports/api';

export function InventoryReportsPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('stock.view');

  const valuation = useQuery({
    queryKey: ['inventory-valuation', selectedProjectId],
    queryFn: () => fetchValuationReport(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });
  const reorder = useQuery({
    queryKey: ['inventory-reorder-report', selectedProjectId],
    queryFn: () => fetchReorderReport(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view reports.</Alert>;
  }
  if (valuation.isError || reorder.isError) {
    return (
      <RetryPanel
        onRetry={() => {
          void valuation.refetch();
          void reorder.refetch();
        }}
      />
    );
  }

  const val = valuation.data;
  const reorderLines = reorder.data?.lines ?? [];

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Inventory Reports</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1">Valuation</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Total value:{' '}
          {val ? val.totalValue.toLocaleString() : '—'} (from cost layers /
          ledger)
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(val?.lines ?? []).slice(0, 25).map((line) => (
              <TableRow key={line.materialId}>
                <TableCell>
                  {line.materialCode ?? line.materialId} — {line.name}
                </TableCell>
                <TableCell align="right">{line.quantity}</TableCell>
                <TableCell align="right">{line.value.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1">Reorder</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell align="right">On hand</TableCell>
              <TableCell align="right">Reorder</TableCell>
              <TableCell align="right">Suggested</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reorderLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No reorder items.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              reorderLines.slice(0, 50).map((line) => (
                <TableRow key={line.materialId}>
                  <TableCell>
                    {line.materialCode} — {line.name}
                  </TableCell>
                  <TableCell align="right">{line.onHand}</TableCell>
                  <TableCell align="right">{line.reorderLevel}</TableCell>
                  <TableCell align="right">{line.suggestedOrder}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
