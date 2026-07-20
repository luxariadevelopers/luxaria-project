import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { Button, Stack } from '@mui/material';

export function NoProjectAccessPage() {
  const { refetch, isLoading } = useProject();

  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <PermissionDenied
        title="No project access"
        message="You are not assigned to any project, and you do not have global project access. Ask an administrator to assign projects via project access."
        showHomeLink
      />
      <Button
        variant="outlined"
        disabled={isLoading}
        onClick={() => void refetch()}
      >
        Retry
      </Button>
    </Stack>
  );
}
