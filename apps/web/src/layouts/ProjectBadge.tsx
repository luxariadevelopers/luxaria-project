import { Chip, Tooltip } from '@mui/material';
import { useProject } from '@/context/ProjectContext';

type ProjectBadgeProps = {
  /** Compact chip for header; default shows code — name. */
  dense?: boolean;
};

export function ProjectBadge({ dense = true }: ProjectBadgeProps) {
  const { selectedProject, isLoading, globalAccess } = useProject();

  if (isLoading) {
    return null;
  }

  if (!selectedProject) {
    return (
      <Chip
        size="small"
        variant="outlined"
        label={globalAccess ? 'All projects' : 'No project'}
        sx={{ display: { xs: 'none', md: 'inline-flex' } }}
      />
    );
  }

  const label = dense
    ? selectedProject.projectCode
    : `${selectedProject.projectCode} — ${selectedProject.projectName}`;

  return (
    <Tooltip title={`${selectedProject.projectCode} — ${selectedProject.projectName}`}>
      <Chip
        size="small"
        color="primary"
        variant="outlined"
        label={label}
        sx={{ fontWeight: 600, maxWidth: 200 }}
      />
    </Tooltip>
  );
}
