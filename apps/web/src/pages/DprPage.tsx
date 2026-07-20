import { useQuery } from '@tanstack/react-query';
import { Stack, Typography, Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { apiGet } from '@/api/client';
import { DataTable } from '@/components/DataTable';
import { useProject } from '@/context/ProjectContext';

type DprRow = {
  id: string;
  dprNumber: string;
  reportDate: string;
  weather: string;
  labourCount: number;
  status: string;
  siteCashBalance: number;
  workPerformed: string | null;
};

export function DprPage() {
  const { selectedProjectId } = useProject();

  const { data, isLoading, error } = useQuery({
    queryKey: ['daily-progress-reports', selectedProjectId],
    queryFn: async () => {
      const res = await apiGet<DprRow[]>('/daily-progress-reports', {
        projectId: selectedProjectId ?? undefined,
        limit: 50,
      });
      return res.data ?? [];
    },
  });

  const columns: GridColDef<DprRow>[] = [
    { field: 'dprNumber', headerName: 'DPR No', width: 150 },
    {
      field: 'reportDate',
      headerName: 'Date',
      width: 130,
      valueGetter: (_v, row) =>
        row.reportDate ? String(row.reportDate).slice(0, 10) : '',
    },
    { field: 'weather', headerName: 'Weather', width: 110 },
    { field: 'labourCount', headerName: 'Labour', width: 90 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip size="small" label={params.value} variant="outlined" />
      ),
    },
    {
      field: 'siteCashBalance',
      headerName: 'Site cash',
      width: 120,
      valueFormatter: (value: number) =>
        value != null ? Number(value).toLocaleString('en-IN') : '—',
    },
    {
      field: 'workPerformed',
      headerName: 'Work performed',
      flex: 1,
      minWidth: 220,
    },
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Daily Progress Reports</Typography>
      <Typography color="text.secondary">
        Site DPRs for mobile and web. Submit from the field app (offline-ready);
        review and PDF on the backend.
      </Typography>
      {error ? (
        <Typography color="error">
          {(error as Error).message || 'Failed to load DPRs'}
        </Typography>
      ) : null}
      <DataTable
        title={selectedProjectId ? 'Project DPRs' : 'All DPRs'}
        rows={data ?? []}
        columns={columns}
        loading={isLoading}
        height={480}
        getRowId={(row) => row.id}
      />
    </Stack>
  );
}
