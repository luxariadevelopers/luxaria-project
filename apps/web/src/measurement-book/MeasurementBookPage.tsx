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
import { fetchMeasurementBookEntries } from '@/measurement-book/api';

function formatDims(row: {
  length: number | null;
  breadth: number | null;
  height: number | null;
  numberOfUnits: number;
}): string {
  const parts = [
    row.numberOfUnits != null ? `${row.numberOfUnits} nos` : null,
    row.length != null ? `L ${row.length}` : null,
    row.breadth != null ? `B ${row.breadth}` : null,
    row.height != null ? `H ${row.height}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' × ') : '—';
}

/**
 * Measurement Book register — Phase 6 W5.
 * Nest: `GET /measurement-book` (`measurement.view`).
 * Route registration is a parent follow-up (see CTR-INTEGRATION.md).
 */
export function MeasurementBookPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('measurement.view');

  const query = useQuery({
    queryKey: ['measurement-book', selectedProjectId],
    queryFn: () =>
      fetchMeasurementBookEntries({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">
        Select a project to view the measurement book.
      </Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Measurement Book</Typography>
      <Typography variant="body2" color="text.secondary">
        Formal MB register for contractor billing — L/B/H quantities, WO/DPR
        links, engineer submit, contractor acknowledgement, verify/certify, and
        revision history (no silent edit of certified quantities).
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Entry</TableCell>
              <TableCell>Rev</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>BOQ</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Dims</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell>WO</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary">
                    No measurement book entries for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.entryNumber}</TableCell>
                  <TableCell>{row.revision}</TableCell>
                  <TableCell>
                    {row.periodFrom.slice(0, 10)} → {row.periodTo.slice(0, 10)}
                  </TableCell>
                  <TableCell>{row.boqCode || row.boqItemId.slice(-6)}</TableCell>
                  <TableCell>
                    {row.location.locationLabel || '—'}
                  </TableCell>
                  <TableCell>{formatDims(row)}</TableCell>
                  <TableCell align="right">
                    {row.quantity} {row.unit}
                  </TableCell>
                  <TableCell>
                    {row.workOrderId ? row.workOrderId.slice(-6) : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.status} />
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
