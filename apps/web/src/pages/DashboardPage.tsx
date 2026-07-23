import { Link as RouterLink } from 'react-router-dom';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const canOpenDashboards = hasPermission('dashboard.view');

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle="Home overview for day-to-day work across projects and modules."
      />
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Welcome, {user?.fullName ?? 'User'}
        </Typography>
        <Typography color="text.secondary">
          Use overview modules for day-to-day work. Users with dashboard access
          can open the Director Command Centre or Finance workspace.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          Active project:{' '}
          {selectedProject
            ? `${selectedProject.projectCode} — ${selectedProject.projectName}`
            : 'None selected (use the header selector)'}
        </Typography>
        {canOpenDashboards ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mt: 2 }}
          >
            <Button
              component={RouterLink}
              to="/dashboard/director"
              variant="contained"
            >
              Director Command Centre
            </Button>
            <Button
              component={RouterLink}
              to="/dashboard/finance"
              variant="outlined"
            >
              Finance dashboard
            </Button>
          </Stack>
        ) : null}
      </Paper>
    </Stack>
  );
}
