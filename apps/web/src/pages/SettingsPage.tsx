import { Box, CircularProgress, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  NotificationPreferencesForm,
  ProfileSummary,
  SettingsQuickLinks,
} from '@/settings';

export function SettingsPage() {
  const { user, access, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <ProfileSummary user={user} access={access} loading={false} />
      <NotificationPreferencesForm />
      <SettingsQuickLinks />
    </Stack>
  );
}
