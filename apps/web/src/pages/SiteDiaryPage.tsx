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
import { fetchSiteDiaryEntries } from '@/site-diary/api';

export function SiteDiaryPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_diary.view');

  const query = useQuery({
    queryKey: ['site-diary', selectedProjectId],
    queryFn: () =>
      fetchSiteDiaryEntries({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view the site diary.</Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Site Diary</Typography>
      <Typography variant="body2" color="text.secondary">
        Meetings, delays, visitors, instructions, and risks linked to project /
        DPR.
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Visitors</TableCell>
              <TableCell align="right">Photos</TableCell>
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
                    No diary entries for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.entryDate.slice(0, 10)}
                  </TableCell>
                  <TableCell>{row.entryType}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    {row.visitors.length === 0
                      ? '—'
                      : row.visitors.map((v) => v.name).join(', ')}
                  </TableCell>
                  <TableCell align="right">
                    {row.photoDocumentIds.length}
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
