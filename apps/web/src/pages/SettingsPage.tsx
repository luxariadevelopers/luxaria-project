import { Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';

export function SettingsPage() {
  const { user, access } = useAuth();

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile
        </Typography>
        <Typography color="text.secondary">User code: {user?.userCode}</Typography>
        <Typography color="text.secondary">Email: {user?.email ?? '—'}</Typography>
        <Typography color="text.secondary">
          Roles: {access?.roleCodes?.join(', ') || '—'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Application settings UI will be added in later phases.
        </Typography>
      </Paper>
    </Stack>
  );
}
