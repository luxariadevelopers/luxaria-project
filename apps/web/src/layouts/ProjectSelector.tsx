import { useState } from 'react';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import {
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { useProject } from '@/context/ProjectContext';

export function ProjectSelector() {
  const {
    projects,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    isLoading,
    error,
    hasNoProjectAccess,
    globalAccess,
  } = useProject();
  const [mobileAnchor, setMobileAnchor] = useState<null | HTMLElement>(null);

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  if (error) {
    return (
      <Typography
        variant="caption"
        color="error"
        sx={{ display: { xs: 'none', sm: 'inline' } }}
      >
        Project list unavailable
      </Typography>
    );
  }

  if (hasNoProjectAccess) {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: 'none', sm: 'inline' } }}
      >
        No project access
      </Typography>
    );
  }

  const compactLabel = selectedProject
    ? selectedProject.projectCode
    : globalAccess
      ? 'All'
      : 'Project';

  const fullLabel = selectedProject
    ? `${selectedProject.projectCode} — ${selectedProject.projectName}`
    : globalAccess
      ? 'All projects'
      : 'Select project';

  return (
    <>
      {/* Desktop / tablet: full select */}
      <FormControl
        size="small"
        sx={{ minWidth: 220, display: { xs: 'none', md: 'inline-flex' } }}
      >
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

      {/* Mobile: compact chip/button + menu */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
        <Tooltip title={fullLabel}>
          <IconButton
            size="small"
            aria-label={`Project: ${fullLabel}`}
            aria-haspopup="true"
            aria-expanded={mobileAnchor ? 'true' : undefined}
            onClick={(e) => setMobileAnchor(e.currentTarget)}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              px: 1,
              py: 0.5,
              minHeight: 36,
              gap: 0.75,
              maxWidth: 140,
            }}
          >
            <BusinessOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, maxWidth: 88 }}
              noWrap
            >
              {compactLabel}
            </Typography>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={mobileAnchor}
          open={Boolean(mobileAnchor)}
          onClose={() => setMobileAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 240, maxWidth: 320 } } }}
        >
          {globalAccess ? (
            <MenuItem
              selected={!selectedProjectId}
              onClick={() => {
                setSelectedProjectId(null);
                setMobileAnchor(null);
              }}
            >
              <ListItemText primary="All projects" />
            </MenuItem>
          ) : null}
          {projects.map((project) => (
            <MenuItem
              key={project.id}
              selected={selectedProjectId === project.id}
              onClick={() => {
                setSelectedProjectId(project.id);
                setMobileAnchor(null);
              }}
            >
              <ListItemText
                primary={project.projectCode}
                secondary={project.projectName}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </>
  );
}
