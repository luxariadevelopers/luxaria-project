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
import { fetchSiteIssues, type PublicSiteIssue } from '@/site-issues/api';
import { SiteIssueFormDrawer } from '@/site-issues/SiteIssueFormDrawer';

function statusColor(
  status: string,
): 'default' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'open':
      return 'warning';
    case 'assigned':
      return 'info';
    case 'resolved':
      return 'success';
    case 'closed':
      return 'default';
    default:
      return 'default';
  }
}

function canEditIssue(row: PublicSiteIssue): boolean {
  return row.status === 'open' || row.status === 'assigned';
}

export function SiteIssuesPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_issue.view');
  const canCreate = hasPermission('site_issue.create');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<PublicSiteIssue | null>(null);

  const query = useQuery({
    queryKey: ['site-issues', selectedProjectId],
    queryFn: () => fetchSiteIssues({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: PublicSiteIssue) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view site issues.</Alert>;
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
          <Typography variant="h5">Site Issues</Typography>
          <Typography variant="body2" color="text.secondary">
            Delays, shortages, equipment failures, and design clarifications.
            Workflow: open → assigned → resolved → closed.
          </Typography>
        </Stack>
        {canCreate ? (
          <Button variant="contained" onClick={openCreate}>
            New issue
          </Button>
        ) : null}
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Number</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              {canCreate ? <TableCell align="right">Actions</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={canCreate ? 6 : 5}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canCreate ? 6 : 5}>
                  <Typography variant="body2" color="text.secondary">
                    No site issues for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.issueNumber}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.type.replaceAll('_', ' ')}</TableCell>
                  <TableCell>{row.severity}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={statusColor(row.status)}
                    />
                  </TableCell>
                  {canCreate ? (
                    <TableCell align="right">
                      {canEditIssue(row) ? (
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

      {canCreate ? (
        <SiteIssueFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          issue={editTarget}
        />
      ) : null}
    </Stack>
  );
}
