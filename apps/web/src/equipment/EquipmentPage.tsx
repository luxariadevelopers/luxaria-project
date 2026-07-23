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
import { listEquipment, type Equipment } from '@/equipment/api';
import { EquipmentFormDrawer } from '@/equipment/EquipmentFormDrawer';

export function EquipmentPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('equipment.view');
  const canManage = hasPermission('equipment.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Equipment | null>(null);

  const query = useQuery({
    queryKey: ['equipment', selectedProjectId],
    queryFn: () => listEquipment(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: Equipment) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view equipment.</Alert>;
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
          <Typography variant="h5">Equipment</Typography>
          <Typography variant="body2" color="text.secondary">
            Master register with allocation, fuel, maintenance, breakdown, and
            DPR utilization. Enable via project setting equipmentEnabled before
            logging utilization.
          </Typography>
        </Stack>
        {canManage ? (
          <Button variant="contained" onClick={openCreate}>
            New equipment
          </Button>
        ) : null}
      </Box>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Ownership</TableCell>
              <TableCell>Status</TableCell>
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
                    No equipment yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.type || '—'}</TableCell>
                  <TableCell>{row.ownership}</TableCell>
                  <TableCell>
                    <Chip size="small" label={row.status} />
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
        <EquipmentFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          equipment={editTarget}
        />
      ) : null}
    </Stack>
  );
}
