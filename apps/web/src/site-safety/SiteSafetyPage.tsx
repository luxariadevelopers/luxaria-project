import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
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
import { listSiteSafety, type SiteSafety } from '@/site-safety/api';
import { SiteSafetyFormDrawer } from '@/site-safety/SiteSafetyFormDrawer';

function canEditSafety(row: SiteSafety): boolean {
  return row.status !== 'closed';
}

export function SiteSafetyPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('safety.view');
  const canManage = hasPermission('safety.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<SiteSafety | null>(null);

  const query = useQuery({
    queryKey: ['site-safety', selectedProjectId],
    queryFn: () => listSiteSafety(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: SiteSafety) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view site safety.</Alert>
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
          <Typography variant="h5">Site Safety / HSE</Typography>
          <Typography variant="body2" color="text.secondary">
            Near misses, accidents, PPE checks, toolbox talks, and safety
            inspections.
          </Typography>
        </Stack>
        {canManage ? (
          <Button variant="contained" onClick={openCreate}>
            New record
          </Button>
        ) : null}
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Attendees</TableCell>
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
                    No safety records yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.type.replaceAll('_', ' ')}</TableCell>
                  <TableCell>
                    <Chip size="small" label={row.severity} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.status} />
                  </TableCell>
                  <TableCell>{row.attendees?.length ?? 0}</TableCell>
                  {canManage ? (
                    <TableCell align="right">
                      {canEditSafety(row) ? (
                        <Button size="small" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {canManage ? (
        <SiteSafetyFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          record={editTarget}
        />
      ) : null}
    </Stack>
  );
}
