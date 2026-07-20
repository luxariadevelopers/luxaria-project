import { Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';

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
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Projects</Typography>
      <Typography color="text.secondary">
        Placeholder page. Project management UI will be implemented later.
      </Typography>
      <DataTable
        title="Projects"
        rows={PLACEHOLDER_ROWS}
        columns={columns}
        height={320}
      />
    </Stack>
  );
}
