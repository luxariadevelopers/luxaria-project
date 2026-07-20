import { Alert, Button, Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/DataTable';
import { useProject } from '@/context/ProjectContext';
import type { QuickSearchHit } from '@/quick-search';

type PlaceholderProject = {
  id: string;
  code: string;
  name: string;
  status: string;
};

const PLACEHOLDER_ROWS: PlaceholderProject[] = [
  {
    id: '1',
    code: 'PRJ-XXXX',
    name: 'Sample Project',
    status: '—',
  },
];

const columns: GridColDef<PlaceholderProject>[] = [
  { field: 'code', headerName: 'Code', width: 140 },
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
  { field: 'status', headerName: 'Status', width: 140 },
];

export function ProjectsPage() {
  const { hasPermission } = useAuth();
  const { selectedProject, selectedProjectId } = useProject();
  const location = useLocation();
  const hit = (location.state as { quickSearchHit?: QuickSearchHit } | null)
    ?.quickSearchHit;
  const canOpenDashboard =
    hasPermission('dashboard.view') && Boolean(selectedProjectId);
  const canOpenParticipants =
    hasPermission('project_participant.view') && Boolean(selectedProjectId);

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Placeholder page. Project management UI will be implemented later.
        Quick search (⌘K) can activate a permitted project in the header.
      </Typography>
      {hit?.sourceId === 'projects' || selectedProject ? (
        <Alert severity="info" variant="outlined">
          Active project:{' '}
          {hit?.sourceId === 'projects'
            ? `${hit.title} (${hit.subtitle})`
            : `${selectedProject?.projectName ?? selectedProjectId} (${selectedProject?.projectCode ?? '—'})`}
        </Alert>
      ) : null}
      {canOpenDashboard ? (
        <Button
          component={RouterLink}
          to={`/projects/${selectedProjectId}/dashboard`}
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        >
          Open project dashboard
        </Button>
      ) : null}
      {canOpenParticipants ? (
        <Button
          component={RouterLink}
          to={`/projects/${selectedProjectId}/participants`}
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        >
          Open participants
        </Button>
      ) : null}
      <DataTable
        title="Projects"
        rows={PLACEHOLDER_ROWS}
        columns={columns}
        height={320}
      />
    </Stack>
  );
}
