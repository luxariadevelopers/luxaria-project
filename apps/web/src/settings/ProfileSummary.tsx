import {
  Avatar,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { AuthUser, UserAccess } from '@/api/types';

type ProfileSummaryProps = {
  user: AuthUser | null;
  access: UserAccess | null;
  loading?: boolean;
};

function initials(name: string | undefined): string {
  if (!name?.trim()) {
    return 'U';
  }
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || 'U';
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.25, sm: 2 }}
      sx={{ py: 0.75 }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: { sm: 140 }, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function ProfileSummary({ user, access, loading }: ProfileSummaryProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          Profile
        </Typography>

        {loading ? (
          <Typography color="text.secondary">Loading profile…</Typography>
        ) : !user ? (
          <Typography color="text.secondary">
            Profile details are unavailable. Try signing in again.
          </Typography>
        ) : (
          <>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'primary.main',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {initials(user.fullName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {user.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.userCode}
                </Typography>
              </Box>
            </Stack>

            <Box>
              <DetailRow label="Email" value={user.email ?? '—'} />
              <DetailRow label="Mobile" value={user.mobile ?? '—'} />
              <DetailRow label="Status" value={formatStatus(user.status)} />
            </Box>

            {access?.roleCodes?.length ? (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                {access.roleCodes.map((role) => (
                  <Chip key={role} label={role} size="small" variant="outlined" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No roles assigned
              </Typography>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
