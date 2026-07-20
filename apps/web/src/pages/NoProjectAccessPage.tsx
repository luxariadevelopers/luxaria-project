import { Stack, Typography } from '@mui/material';

/** Shown when the user has no accessible projects for a project-scoped route. */
export function NoProjectAccessPage() {
  return (
    <Stack spacing={1} sx={{ py: 4 }}>
      <Typography variant="h5">No project access</Typography>
      <Typography color="text.secondary">
        You need access to at least one active project to open this page.
        Ask an administrator to grant project membership.
      </Typography>
    </Stack>
  );
}
