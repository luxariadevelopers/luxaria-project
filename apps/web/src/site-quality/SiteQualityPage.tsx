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
import { listSiteQuality, type SiteQuality } from '@/site-quality/api';
import { SiteQualityFormDrawer } from '@/site-quality/SiteQualityFormDrawer';

function canEditQuality(row: SiteQuality): boolean {
  return row.status !== 'closed' && row.status !== 'cancelled';
}

export function SiteQualityPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_quality.view');
  const canManage = hasPermission('site_quality.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<SiteQuality | null>(null);

  const query = useQuery({
    queryKey: ['site-quality', selectedProjectId],
    queryFn: () => listSiteQuality(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: SiteQuality) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view site quality.</Alert>
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
          <Typography variant="h5">Site Quality</Typography>
          <Typography variant="body2" color="text.secondary">
            Workmanship inspections, NCRs, punch lists, and re-inspections.
            Separate from GRN / vendor quality inspections.
          </Typography>
        </Stack>
        {canManage ? (
          <Button variant="contained" onClick={openCreate}>
            New inspection
          </Button>
        ) : null}
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>NCR #</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Findings</TableCell>
              <TableCell>Punch items</TableCell>
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
                    No site quality records yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
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
                  {canManage ? (
                    <TableCell align="right">
                      {canEditQuality(row) ? (
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
        <SiteQualityFormDrawer
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
