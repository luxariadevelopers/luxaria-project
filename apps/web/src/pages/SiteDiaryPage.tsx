import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
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
  fetchSiteDiaryEntries,
  type PublicSiteDiaryEntry,
} from '@/site-diary/api';
import { SiteDiaryFormDrawer } from '@/site-diary/SiteDiaryFormDrawer';

export function SiteDiaryPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_diary.view');
  const canManage = hasPermission('site_diary.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<PublicSiteDiaryEntry | null>(
    null,
  );

  const query = useQuery({
    queryKey: ['site-diary', selectedProjectId],
    queryFn: () =>
      fetchSiteDiaryEntries({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: PublicSiteDiaryEntry) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view the site diary.</Alert>
    );
  }
  if (query.isError) {
    return (
      <RetryPanel
        error={query.error}
        onRetry={() => void query.refetch()}
        forceRetry
      />
    );
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 1.5,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Site Diary</Typography>
          <Typography variant="body2" color="text.secondary">
            Meetings, delays, visitors, instructions, and risks linked to
            project / DPR.
          </Typography>
        </Stack>
        {canManage ? (
          <Button variant="contained" onClick={openCreate}>
            New entry
          </Button>
        ) : null}
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Visitors</TableCell>
              <TableCell align="right">Photos</TableCell>
              {canManage ? <TableCell align="right">Actions</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5}>
                  <Typography variant="body2" color="text.secondary">
                    No diary entries for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.entryDate.slice(0, 10)}</TableCell>
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
                  {canManage ? (
                    <TableCell align="right">
                      <Button size="small" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {canManage ? (
        <SiteDiaryFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          entry={editTarget}
        />
      ) : null}
    </Stack>
  );
}
