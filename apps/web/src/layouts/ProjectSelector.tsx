import {
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useProject } from '@/context/ProjectContext';

export function ProjectSelector() {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    error,
    hasNoProjectAccess,
    globalAccess,
  } = useProject();

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  if (error) {
    return (
      <Typography variant="caption" color="error">
        Project list unavailable
      </Typography>
    );
  }

  if (hasNoProjectAccess) {
    return (
      <Typography variant="caption" color="text.secondary">
        No project access
      </Typography>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel id="project-selector-label" shrink>
        Project
      </InputLabel>
      <Select
        labelId="project-selector-label"
        label="Project"
        value={selectedProjectId ?? ''}
        displayEmpty
        notched
        renderValue={(value) => {
          if (!value) {
            return (
              <em>{globalAccess ? 'All projects' : 'Select project'}</em>
            );
          }
          const project = projects.find((row) => row.id === value);
          return project
            ? `${project.projectCode} — ${project.projectName}`
            : String(value);
        }}
        onChange={(e) =>
          setSelectedProjectId(e.target.value ? String(e.target.value) : null)
        }
      >
        {globalAccess ? (
          <MenuItem value="">
            <em>All projects</em>
          </MenuItem>
        ) : !selectedProjectId ? (
          <MenuItem value="" disabled>
            <em>Select project</em>
          </MenuItem>
        ) : null}
        {projects.map((project) => (
          <MenuItem key={project.id} value={project.id}>
            {project.projectCode} — {project.projectName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
