import { Link as RouterLink, useParams } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import { dprListPath } from '@/dpr';

/**
 * Placeholder detail shell — Micro Phase 083 will replace this route element.
 * Route: `/project-control/dpr/:id`
 */
export function DprDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Daily progress report</Typography>
      <Typography color="text.secondary">
        Detail view for DPR {id ?? '—'} is planned for Micro Phase 083.
      </Typography>
      <Button component={RouterLink} to={dprListPath()} variant="outlined">
        Back to list
      </Button>
    </Stack>
  );
}
