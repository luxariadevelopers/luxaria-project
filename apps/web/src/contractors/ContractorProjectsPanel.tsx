import {
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { formatDateTime } from '@/format';
import { contractorProjectAssignmentStatusLabel } from './labels';
import type { PublicContractorProjectAssignment } from './types';

type Props = {
  assignments: readonly PublicContractorProjectAssignment[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
};

export function ContractorProjectsPanel({
  assignments,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  const { projects } = useProject();

  if (!canView) {
    return (
      <PermissionDenied
        title="Projects unavailable"
        message="You need contractor.view to list contractor project assignments."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading project assignments…
      </Typography>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        title="No project assignments"
        description="Active project assignments for this contractor will appear here."
      />
    );
  }

  return (
    <Stack spacing={1} data-testid="contractor-projects-panel">
      <List dense disablePadding>
        {assignments.map((row) => {
          const project = projects.find((p) => p.id === row.projectId);
          const label = project
            ? project.projectCode
              ? `${project.projectCode} · ${project.projectName}`
              : project.projectName
            : row.projectId;
          return (
            <ListItem key={row.id} divider disableGutters>
              <ListItemText
                primary={label}
                secondary={`${contractorProjectAssignmentStatusLabel(row.status)}${
                  row.assignedAt
                    ? ` · assigned ${formatDateTime(row.assignedAt)}`
                    : ''
                }${row.notes ? ` · ${row.notes}` : ''}`}
              />
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );
}
