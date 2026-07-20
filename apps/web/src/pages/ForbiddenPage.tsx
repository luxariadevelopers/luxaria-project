import { Link as RouterLink } from 'react-router-dom';
import { Button, Paper, Stack, Typography } from '@mui/material';

export function ForbiddenPage() {
  return (
    <Paper variant="outlined" sx={{ p: 4, maxWidth: 560 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Access denied</Typography>
        <Typography color="text.secondary">
          You do not have permission to view this page.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ alignSelf: 'flex-start' }}>
          Back to dashboard
        </Button>
      </Stack>
    </Paper>
  );
}
