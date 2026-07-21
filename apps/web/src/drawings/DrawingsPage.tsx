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
import { listDrawings } from '@/drawings/api';

export function DrawingsPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('drawing.view');

  const query = useQuery({
    queryKey: ['drawings', selectedProjectId],
    queryFn: () =>
      listDrawings({
        projectId: selectedProjectId!,
        isLatest: true,
      }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view drawings.</Alert>;
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Drawing Register</Typography>
      <Typography variant="body2" color="text.secondary">
        Latest revisions only. Upload a new revision to supersede the previous
        issue. Files are stored via the documents module.
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Drawing #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Discipline</TableCell>
              <TableCell>Rev</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No drawings yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.drawingNumber}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.discipline || '—'}</TableCell>
                  <TableCell>{row.revision}</TableCell>
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
