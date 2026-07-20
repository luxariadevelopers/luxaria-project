import { useQuery } from '@tanstack/react-query';
import { Stack, Typography, Chip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { projectScopedQueryKey } from '@luxaria/shared-types';
import { apiGet } from '@/api/client';
import { DataTable } from '@/components/DataTable';
import { EmptyState, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';

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

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: projectScopedQueryKey(
      'daily-progress-reports',
      selectedProjectId,
    ),
    queryFn: async () => {
      const res = await apiGet<DprRow[]>('/daily-progress-reports', {
        projectId: selectedProjectId ?? undefined,
        limit: 50,
      });
      return res.data ?? [];
    },
    enabled: Boolean(selectedProjectId),
  });


  const columns: GridColDef<DprRow>[] = [
    { field: 'dprNumber', headerName: 'DPR No', width: 150 },
    {
      field: 'reportDate',
      headerName: 'Date',
      width: 130,
      valueFormatter: (value: string) => formatDate(value),
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
      width: 140,
      valueFormatter: (value: number) => formatInr(value),
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
      <Typography color="text.secondary">
        Site DPRs for mobile and web. Submit from the field app (offline-ready);
        review and PDF on the backend.
      </Typography>
      {error ? (
        <RetryPanel
          error={error}
          onRetry={() => {
            void refetch();
          }}
          forceRetry
        />
      ) : !isLoading && (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No DPRs yet"
          description="Daily progress reports submitted from the site app will appear here."
        />
      ) : (
        <DataTable
          title="Project DPRs"
          rows={data ?? []}
          columns={columns}
          loading={isLoading || isFetching}
          height={480}
          getRowId={(row) => row.id}
        />
      )}

    </Stack>
  );
}

