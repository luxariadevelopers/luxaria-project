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
import { listSiteQuality } from '@/site-quality/api';

export function SiteQualityPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_quality.view');

  const query = useQuery({
    queryKey: ['site-quality', selectedProjectId],
    queryFn: () => listSiteQuality(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view site quality.</Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Site Quality</Typography>
      <Typography variant="body2" color="text.secondary">
        Workmanship inspections, NCRs, punch lists, and re-inspections. Separate
        from GRN / vendor quality inspections.
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>NCR #</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Findings</TableCell>
              <TableCell>Punch items</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No site quality records yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.ncrNumber || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={row.status} />
                  </TableCell>
                  <TableCell>
                    {row.findings
                      ? row.findings.length > 60
                        ? `${row.findings.slice(0, 60)}…`
                        : row.findings
                      : '—'}
                  </TableCell>
                  <TableCell>{row.punchItems?.length ?? 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
