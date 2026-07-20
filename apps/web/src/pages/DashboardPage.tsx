import { Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { useProject } from '@/context/ProjectContext';

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedProject } = useProject();

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Dashboard</Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Welcome, {user?.fullName ?? 'User'}
        </Typography>
        <Typography color="text.secondary">
          This is a placeholder dashboard. Business widgets will be added in later
          phases.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          Active project:{' '}
          {selectedProject
            ? `${selectedProject.projectCode} — ${selectedProject.projectName}`
            : 'All projects'}
        </Typography>
      </Paper>
    </Stack>
  );
}
