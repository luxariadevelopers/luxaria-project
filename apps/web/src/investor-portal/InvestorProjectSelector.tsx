import {
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useInvestorPortal } from './InvestorPortalContext';

export function InvestorProjectSelector() {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isProjectsLoading,
    projectsError,
    refetchProjects,
  } = useInvestorPortal();

  if (isProjectsLoading) {
    return <CircularProgress size={20} data-testid="investor-project-loading" />;
  }

  if (projectsError) {
    return (
      <Typography variant="body2" color="error">
        Projects unavailable.{' '}
        <Typography
          component="button"
          variant="body2"
          onClick={refetchProjects}
          sx={{
            border: 0,
            bgcolor: 'transparent',
            color: 'primary.main',
            cursor: 'pointer',
            p: 0,
            textDecoration: 'underline',
          }}
        >
          Retry
        </Typography>
      </Typography>
    );
  }

  if (!projects.length) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="investor-project-empty">
        No authorised projects
      </Typography>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 220 }} data-testid="investor-project-selector">
      <InputLabel id="investor-project-selector-label">Project</InputLabel>
      <Select
        labelId="investor-project-selector-label"
        label="Project"
        value={selectedProjectId ?? ''}
        onChange={(e) => setSelectedProjectId(String(e.target.value))}
      >
        {projects.map((project) => (
          <MenuItem key={project.projectId} value={project.projectId}>
            {project.projectCode} — {project.projectName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
