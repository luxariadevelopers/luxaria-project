import {
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { useProject } from '@/context/ProjectContext';

export function ProjectSelector() {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
  } = useProject();

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel id="project-selector-label">Project</InputLabel>
      <Select
        labelId="project-selector-label"
        label="Project"
        value={selectedProjectId ?? ''}
        displayEmpty
        onChange={(e) =>
          setSelectedProjectId(e.target.value ? String(e.target.value) : null)
        }
      >
        <MenuItem value="">
          <em>All projects</em>
        </MenuItem>
        {projects.map((project) => (
          <MenuItem key={project.id} value={project.id}>
            {project.projectCode} — {project.projectName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
