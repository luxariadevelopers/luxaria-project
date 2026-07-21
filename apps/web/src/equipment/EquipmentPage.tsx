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
import { listEquipment } from '@/equipment/api';

export function EquipmentPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('equipment.view');

  const query = useQuery({
    queryKey: ['equipment', selectedProjectId],
    queryFn: () => listEquipment(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view equipment.</Alert>;
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Equipment</Typography>
      <Typography variant="body2" color="text.secondary">
        Master register with allocation, fuel, maintenance, breakdown, and DPR
        utilization. Enable via project setting equipmentEnabled before logging
        utilization.
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Ownership</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No equipment yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.type || '—'}</TableCell>
                  <TableCell>{row.ownership}</TableCell>
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
