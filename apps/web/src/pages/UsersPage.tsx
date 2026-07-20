import { Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';

type PlaceholderUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const PLACEHOLDER_ROWS: PlaceholderUser[] = [
  {
    id: '1',
    name: 'Sample User',
    email: 'user@luxaria.dev',
    role: '—',
  },
];

const columns: GridColDef<PlaceholderUser>[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
  { field: 'role', headerName: 'Role', width: 160 },
];

export function UsersPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Users</Typography>
      <Typography color="text.secondary">
        Placeholder page. User management UI will be implemented later.
      </Typography>
      <DataTable
        title="Users"
        rows={PLACEHOLDER_ROWS}
        columns={columns}
        height={320}
      />
    </Stack>
  );
}
